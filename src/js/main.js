// no globals
(function() {
  'use strict';

  // router
  var router = (function() {
    // listener
    window.addEventListener('hashchange', function(event) {
      // handle hash change
      _route(event.target.location.hash);
    }, false);

    // private
    function _route(hash) {
      events.publish('route-' + hash);
    }

    // public
    function init() {
      _route(window.location.hash);
    }
    function add(hash, func) {
      events.subscribe(hash, func);
    }
    function remove() {
      history.pushState("", document.title, window.location.pathname + window.location.search);
    }
    return {
      add: add,
      remove: remove,
      init: init
    };
  })();

  // routes
  var routes =  (function() {
    // public
    function init() {
      router.add('route-#header-helpful', function() {
        modal.toggle('modal-helpful', 'notification', 1500);
      });
      router.add('route-#header-unhelpful', function() {
        modal.toggle('modal-unhelpful', 'dialog');
      });
      router.add('route-#header-search', function() {
        modal.toggle('modal-search', 'dialog');
      });
    }
    return {
      init: init
    }
  })();

  // pub sub
  var events = (function() {
    // properties
    var events = {};
    // methods
    function publish(name, data) {
      if (events[name]) {
        events[name].forEach(function(func) {
          func(data);
        });
      }
    }
    function subscribe(name, func) {
      events[name] = events[name] || [];
      events[name].push(func);
    }
    function unsubscribe(name, func) {
      if (events[name]) {
        for (var i = 0; i < events[name].length; i++) {
          if( events[name][i] === func ) {
            events[name].splice(i, 1);
            break;
          }
        }
      }
    }
    // public
    return {
      publish: publish,
      subscribe: subscribe,
      unsubscribe: unsubscribe
    };
  })();

  // modals
  var modal = (function() {
    // properties
    var cache = {};

    // main
    addCache();
    function addCache() {
      var modals = document.getElementsByClassName('modal');
      for (var i = 0; i < modals.length; i++) {
        var modal = modals[i];
        var id = modal.id;
        var type = modal.classList.contains('notification') ? 'notification' : 'dialog';
        var children = modal.children;
        var background = null;
        var close = null;
        for (var j = 0; j < children.length; j++) {
          var child = children[j];
          var subchildren = child.children;
          background = (child.classList.contains('modal-background')) ? child : background;
          for (var k = 0; k < subchildren.length; k++) {
            var subchild = subchildren[k];
            close = (subchild.classList.contains('modal-close')) ? subchild : close;
            break;
          }
        }
        addListener(id, type, background, close);
        cache[id] = modal;
      }
    }

    function addListener(id, type, background, close) {
      // need separate function because of closure binding within .addEventListener
      close.addEventListener('click', function(event) {
        toggle(id, type);
      });
      if (type === 'notification') return;
      background.addEventListener('click', function(event) {
        toggle(id, type);
      });
    }

    function toggle(id, type, duration) {
      var modal = cache[id];
      if (!modal) return;
      var isModalOpen = modal.classList.contains('active');
      var time = (duration) ? duration : 0;
      var types = (type === 'notification') ? 'notification' : 'dialog';

      isModalOpen ? modal.classList.remove('active') : modal.className += ' active';
      if (types === 'dialog') {
        isModalOpen ? document.body.classList.remove('modal') : document.body.className += ' modal';
        isModalOpen ? router.remove() : null;
      } else if (types === 'notification') {
        setTimeout(function() {
          modal.classList.remove('active');
          router.remove();
        }, time);
      }
    }

    // public
    return {
      toggle: toggle
    };
  })();

  var buttons = (function() {
    // properties
    var buttons = {
      support: {
        url: _getSupportUrl(),
        buttons: document.getElementsByClassName('contact-support'),
        example: '<a href="#" class="contact-support" title="Contact support">Contact support</a>',
      },
      improve: {
        url: _getImproveUrl(),
        buttons: document.getElementsByClassName('improve-doc'),
        example: '<a href="#" class="improve-doc" title="Improve This Doc">Improve this docs</a>',
      }
    }

    // private
    function _getSupportUrl() {
      return 'mailto:integration@branch.io?subject=I need some assistance&body=Hello Branch,%0A%0AI am viewing (' + window.location.href + ').%0A%0AMy Branch Key (https%3A%2F%2Fdashboard.branch.io%2Faccount-settings%2Fapp) is:%0A%0A I need assistance with '
    }
    function _getImproveUrl() {
      var trim = window.location.pathname.replace(/^\/|\/$/g, '').split('/');
      trim = trim[0] === 'docs' ? trim.slice(1, trim.length).join('/') : trim.join('/');
      var path = (trim === '') ? 'index' : trim;
      return 'https://github.com/branchmetrics/docs/edit/master/src/' + path + '.md';
    }

    // public
    function init() {
      for (var key1 in buttons) {
        var button = buttons[key1];
        for (var key2 in button) {
          var value = button[key2];
          if (key2 === 'buttons') {
            for (var i = 0; i < value.length; i++) {
              var element = value[i];
              element.setAttribute('href', button.url);
            }
          }
        }
      }
    }
    function contact(button) {
      window.location.href = buttons.button.url;
    }
    return {
      init: init,
      contact: contact
    };
  })();

  // analytics
  var analytics = (function() {
    // public
    function track(event, category, action) {
      var categoryClean = category || 'none';
      var actionClean = action || 'none';
      ga('send', event, categoryClean, actionClean);
      mixpanel.track(event);
    }
    return {
      track: track
    };
  })();

  var codeTabs = (function() {
    var scrape = (function() {
      // properties
      var minCodeSnippets = 1;

      // private
      function _getCodeGroupItems(group) {
        // scan li elements of code group
        var sections = group.children;
        var contents = [];
        var codeSnippets = 0;
        for (var j = 0; j < sections.length; j++) {
          var section = sections[j];
          var elements = section.children;
          var snippet = _getCodeGroupItemsCodeAndTitle(elements);

          // if valid title and code, then section needs to be converted
          if (snippet.title && snippet.code) {
            contents.push({
              valid: true,
              title: snippet.title,
              code: snippet.code
            });
            codeSnippets++;
          } else {
            contents.push({
              valid: false,
              code: section,
            });
          }
        }
        return {
          contents: contents,
          codeSnippets: codeSnippets
        };
      }

      function _getCodeGroupItemsCodeAndTitle(elements) {
        // scan elements within li
        var title = null;
        var code = null;
        for (var k = 0; k < elements.length; k++) {
          // early exit
          var element = elements[k];
          if (!element.firstElementChild) break;

          // has both title and code
          title = element.firstElementChild.tagName === 'EM' ? element.firstElementChild.innerHTML : title;
          code = element.classList.contains('codehilite') ? element : code;
        }
        return {
          code: code,
          title: title
        };
      }

      // public
      function getCodeGroups() {
        // scan code groups
        var codeGroups = {};
        var groups = 0;
        var codes = document.getElementsByClassName('codehilite');
        for (var i = 0; i < codes.length; i++) {
          // early exit if group of code snippets already viewed
          var code = codes[i];
          var group = code.parentElement.parentElement;
          if (group.hasAttribute('data-parsed')) continue;
          group.setAttribute('data-parsed', true);
          groups++;

          // get code group items
          var codeGroupItems = _getCodeGroupItems(group);

          // determine if a valid code group
          if (codeGroupItems.codeSnippets > minCodeSnippets) {
            codeGroups[i] = {
              group: group,
              sections: codeGroupItems.contents,
              codeSnippets: codeGroupItems.codeSnippets
            };
          }
        }
        return codeGroups;
      }

      return {
        getCodeGroups: getCodeGroups
      };
    })();

    var format = (function() {
      // private
      function _generateCodeSection(type) {
        var output = document.createElement('div');
        output.setAttribute('class', 'tab-code-' + type);
        return output;
      }

      function _generateHtmlCodeSectionItem(type, data, index) {
        var output = null;
        var classes = null;
        if (type === 'button') {
          output = document.createElement('button');
          classes = (index == 0) ? 'tab-code-button active' : 'tab-code-button';
          output.setAttribute('type', 'button');
          output.innerHTML = data;
        } else {
          output = document.createElement('div');
          classes = (index == 0) ? 'tab-code-content active' : 'tab-code-content';
          output.appendChild(data);
        }
        output.setAttribute('class', classes);
        output.setAttribute('data-code-id', index);
        return output;
      }

      function _generateHtmlCodeSectionSeparator(index) {
        var output = document.createElement('span');
        output.setAttribute('class', 'tab-code-separator');
        output.innerHTML = "|";
        return output;
      }

      function _generateCodeContainer(index, codes) {
        var list = document.createElement('li');

        var container = document.createElement('div');
        container.setAttribute('class', 'tab-code-section');
        container.setAttribute('data-code-section', index);

        var buttons = _generateCodeSection('buttons');
        var contents = _generateCodeSection('contents');

        for (var l = 0; l < codes.length; l++) {
          var block = codes[l];
          var button = _generateHtmlCodeSectionItem('button', block.title, l);
          var content = _generateHtmlCodeSectionItem('content', block.code, l);
          var separator = _generateHtmlCodeSectionSeparator(l);
          buttons.appendChild(button);
          if (l != codes.length-1) {
            buttons.appendChild(separator);
          }
          contents.appendChild(content);
        }
        list.appendChild(container);
        container.appendChild(buttons);
        container.appendChild(contents);

        return list;
      }

      // public
      function transformCodeGroups(data) {
        // each group
        for (var key in data) {
          if (data.hasOwnProperty(key)) {
            var block = data[key];
            var codes = [];
            var codeContainer = null;

            // clear html
            block.group.innerHTML = '';

            // each section of group
            for (var i = 0; i < block.sections.length; i++) {
              var section = block.sections[i];
              if (section.valid) {
                codes.push(section);
              } else {
                // append html
                codeContainer = _generateCodeContainer(key, codes);
                block.group.appendChild(codeContainer);
                block.group.appendChild(section.code);
                codes = [];
              }
            }

            if (codes.length > 0) {
              // append html
              codeContainer = _generateCodeContainer(key, codes);
              block.group.appendChild(codeContainer);
            }
          }
        }
      }
      return {
        transformCodeGroups: transformCodeGroups
      };
    })();

    var activate = (function() {
      // cache
      var sections = {};

      // private
      function _mapElementToObject(object, list, value) {
        for (var i = 0; i < list.length; i++) {
          var item = list[i];
          var section = item.parentElement.parentElement.getAttribute('data-code-section');
          var id = item.getAttribute('data-code-id');
          if (!object[section]) {
            object[section] = {};
          }
          if (!object[section][id]) {
            object[section][id] = {};
          }
          object[section][id][value] = item;
        }
        return object;
      }

      function _mapButtonToSection(object) {
        for (var sectionId in object) {
          if (object.hasOwnProperty(sectionId)) {

            var section = object[sectionId];
            for (var codeId in section) {
              if (section.hasOwnProperty(codeId)) {
                var group = section[codeId];
                _handleListenerClosure(group, codeId, section);
              }
            }
          }
        }
      }

      function _handleListenerClosure(group, codeId, section) {
        group.button.addEventListener('click', function() {
          _toggleSection(codeId, section);
        });
      }

      function _toggleSection(codeId, section) {
        for (var id in section) {
          if (section.hasOwnProperty(id)) {
            var group = section[id];
            if (id === codeId) {
              group.button.classList.add('active');
              group.content.classList.add('active');
            } else {
              group.button.classList.remove('active');
              group.content.classList.remove('active');
            }
          }
        }
      }

      // public
      function enableCodeGroups() {
        var buttons = document.getElementsByClassName('tab-code-button');
        var contents = document.getElementsByClassName('tab-code-content');
        _mapElementToObject(sections, buttons, 'button');
        _mapElementToObject(sections, contents, 'content');
        _mapButtonToSection(sections);
      }

      return {
        enableCodeGroups: enableCodeGroups
      };
    })();

    function init() {
      var data = scrape.getCodeGroups();
      format.transformCodeGroups(data);
      activate.enableCodeGroups();
    }

    return {
      init: init
    };
  })();

  // page load
  function onload() {
    analytics.track('viewed page ' + window.location.href);
    routes.init();
    buttons.init();
    codeTabs.init();
    router.init();
  }
  onload();
})();