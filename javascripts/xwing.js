/*
    X-Wing Squad Builder
    Geordan Rosario <geordan@gmail.com>
    https://github.com/geordanr/xwing
*/


(function() {
  var GenericAddon, Modification, SQUAD_DISPLAY_NAME_MAX_LENGTH, Ship, Title, Upgrade, exportObj,
    __slice = [].slice,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.iced = {
    Deferrals: (function() {
      function _Class(_arg) {
        this.continuation = _arg;
        this.count = 1;
        this.ret = null;
      }

      _Class.prototype._fulfill = function() {
        if (!--this.count) {
          return this.continuation(this.ret);
        }
      };

      _Class.prototype.defer = function(defer_params) {
        var _this = this;
        ++this.count;
        return function() {
          var inner_params, _ref;
          inner_params = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          if (defer_params != null) {
            if ((_ref = defer_params.assign_fn) != null) {
              _ref.apply(null, inner_params);
            }
          }
          return _this._fulfill();
        };
      };

      return _Class;

    })(),
    findDeferral: function() {
      return null;
    },
    trampoline: function(_fn) {
      return _fn();
    }
  };
  window.__iced_k = window.__iced_k_noop = function() {};

  exportObj = typeof exports !== "undefined" && exports !== null ? exports : this;

  exportObj.sortHelper = function(a, b) {
    var a_name, b_name;
    if (a.points === b.points) {
      a_name = a.text.replace(/[^a-z0-9]/ig, '');
      b_name = b.text.replace(/[^a-z0-9]/ig, '');
      if (a_name === b_name) {
        return 0;
      } else {
        if (a_name > b_name) {
          return 1;
        } else {
          return -1;
        }
      }
    } else {
      if (a.points > b.points) {
        return 1;
      } else {
        return -1;
      }
    }
  };

  $.isMobile = function() {
    return navigator.userAgent.match(/(iPhone|iPod|iPad|Android)/i);
  };

  $.randomInt = function(n) {
    return Math.floor(Math.random() * n);
  };

  $.getParameterByName = function(name) {
    var regex, regexS, results;
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    regexS = "[\\?&]" + name + "=([^&#]*)";
    regex = new RegExp(regexS);
    results = regex.exec(window.location.search);
    if (results === null) {
      return "";
    } else {
      return decodeURIComponent(results[1].replace(/\+/g, " "));
    }
  };

  Array.prototype.intersects = function(other) {
    var item, _i, _len;
    for (_i = 0, _len = this.length; _i < _len; _i++) {
      item = this[_i];
      if (__indexOf.call(other, item) >= 0) {
        return true;
      }
    }
    return false;
  };

  SQUAD_DISPLAY_NAME_MAX_LENGTH = 24;

  exportObj.SquadBuilder = (function() {
    function SquadBuilder(args) {
      this._makeRandomizerLoopFunc = __bind(this._makeRandomizerLoopFunc, this);
      this._randomizerLoopBody = __bind(this._randomizerLoopBody, this);
      this.releaseUnique = __bind(this.releaseUnique, this);
      this.claimUnique = __bind(this.claimUnique, this);
      this.onSquadNameChanged = __bind(this.onSquadNameChanged, this);
      this.onSquadDirtinessChanged = __bind(this.onSquadDirtinessChanged, this);
      this.onSquadLoadRequested = __bind(this.onSquadLoadRequested, this);
      this.onPointsUpdated = __bind(this.onPointsUpdated, this);
      this.container = $(args.container);
      this.faction = $.trim(args.faction);
      this.printable_container = $(args.printable_container);
      this.ships = [];
      this.uniques_in_use = {
        Pilot: [],
        Upgrade: [],
        Modification: [],
        Title: []
      };
      this.suppress_automatic_new_ship = false;
      this.tooltip_currently_displaying = null;
      this.randomizer_options = {
        sources: null,
        points: 100
      };
      this.backend = null;
      this.current_squad = {};
      this.setupUI();
      this.setupEventHandlers();
      this.resetCurrentSquad();
      if ($.getParameterByName('f') === this.faction) {
        this.loadFromSerialized($.getParameterByName('d'));
      } else {
        this.addShip();
      }
    }

    SquadBuilder.prototype.resetCurrentSquad = function() {
      this.current_squad = {
        id: null,
        name: $.trim(this.squad_name_input.val()) || "Unnamed Squadron",
        dirty: false,
        additional_data: {
          points: this.total_points,
          description: '',
          cards: []
        },
        faction: this.faction
      };
      if (this.total_points > 0) {
        this.current_squad.name = 'Unsaved Squadron';
        this.current_squad.dirty = true;
      }
      this.container.trigger('xwing-backend:squadNameChanged');
      return this.container.trigger('xwing-backend:squadDirtinessChanged');
    };

    SquadBuilder.prototype.setupUI = function() {
      var DEFAULT_RANDOMIZER_ITERATIONS, DEFAULT_RANDOMIZER_POINTS, DEFAULT_RANDOMIZER_TIMEOUT_SEC, content_container, expansion, opt, _i, _len, _ref,
        _this = this;
      DEFAULT_RANDOMIZER_POINTS = 100;
      DEFAULT_RANDOMIZER_TIMEOUT_SEC = 2;
      DEFAULT_RANDOMIZER_ITERATIONS = 1000;
      this.status_container = $(document.createElement('DIV'));
      this.status_container.addClass('container-fluid');
      this.status_container.append($.trim('<div class="row-fluid">\n    <div class="span4 squad-name-container">\n        <div class="display-name">\n            <span class="squad-name"></span>\n            <i class="icon-pencil"></i>\n        </div>\n        <div class="input-append">\n            <input type="text" maxlength="64" placeholder="Name your squad..." />\n            <button class="btn save"><i class="icon-edit"></i></button>\n        </div>\n    </div>\n    <div class="span2 points-display-container">Total Points: 0</div>\n    <div class="span6 pull-right button-container">\n        <div class="btn-group pull-right">\n\n        <button class="btn btn-primary view-as-text">View as Text</button>\n        <button class="btn btn-primary print-list hidden-phone hidden-tablet"><i class="icon-print"></i>&nbsp;Print</button>\n        <a class="btn btn-primary permalink"><i class="icon-link hidden-phone hidden-tablet"></i>&nbsp;Permalink</a>\n\n        <button class="btn btn-primary randomize" ><i class="icon-random hidden-phone hidden-tablet"></i>&nbsp;Random Squad!</button>\n        <button class="btn btn-primary dropdown-toggle" data-toggle="dropdown">\n            <span class="caret"></span>\n        </button>\n        <ul class="dropdown-menu">\n            <li><a class="randomize-options">Randomizer Options...</a></li>\n        </ul>\n    </div>\n</div>\n\n<div class="row-fluid show-authenticated" style="display: none;">\n    <div class="span12">\n        <button class="btn btn-primary save-list"><i class="icon-save"></i>&nbsp;Save</button>\n        <button class="btn btn-primary save-list-as"><i class="icon-copy"></i>&nbsp;Save As...</button>\n        <button class="btn btn-primary delete-list disabled"><i class="icon-trash"></i>&nbsp;Delete</button>\n        <button class="btn btn-primary backend-list-my-squads show-authenticated">Your Squads</button>\n        <!-- <button class="btn btn-primary backend-list-all-squads show-authenticated">Everyone\'s Squads</button> -->\n        <span class="backend-status"></span>\n    </div>\n</div>'));
      this.container.append(this.status_container);
      this.list_modal = $(document.createElement('DIV'));
      this.list_modal.addClass('modal hide fade text-list-modal');
      this.container.append(this.list_modal);
      this.list_modal.append($.trim("<div class=\"modal-header\">\n    <button type=\"button\" class=\"close hidden-print\" data-dismiss=\"modal\" aria-hidden=\"true\">&times;</button>\n    <div class=\"fancy-header\">\n        <div class=\"squad-name\"></div>\n        <div class=\"mask\">\n            <div class=\"outer-circle\">\n                <div class=\"inner-circle\">\n                    <span class=\"total-points\"></span>\n                </div>\n            </div>\n        </div>\n    </div>\n    <div class=\"fancy-under-header\"></div>\n</div>\n<div class=\"modal-body\">\n    <div class=\"fancy-list\"></div>\n</div>\n<div class=\"modal-footer hidden-print\">\n    <button class=\"btn print-list hidden-phone\"><i class=\"icon-print\"></i>&nbsp;Print</button>\n    <button class=\"btn\" data-dismiss=\"modal\" aria-hidden=\"true\">Close</button>\n</div>"));
      this.fancy_container = $(this.list_modal.find('div.modal-body .fancy-list'));
      this.fancy_total_points_container = $(this.list_modal.find('div.modal-header .total-points'));
      this.squad_name_container = $(this.status_container.find('div.squad-name-container'));
      this.squad_name_display = $(this.container.find('.display-name'));
      this.squad_name_placeholder = $(this.container.find('.squad-name'));
      this.squad_name_input = $(this.squad_name_container.find('input'));
      this.squad_name_save_button = $(this.squad_name_container.find('button.save'));
      this.squad_name_input.closest('div').hide();
      this.points_container = $(this.status_container.find('div.points-display-container'));
      this.permalink = $(this.status_container.find('div.button-container a.permalink'));
      this.view_list_button = $(this.status_container.find('div.button-container button.view-as-text'));
      this.randomize_button = $(this.status_container.find('div.button-container button.randomize'));
      this.customize_randomizer = $(this.status_container.find('div.button-container a.randomize-options'));
      this.backend_status = $(this.status_container.find('.backend-status'));
      this.backend_status.hide();
      this.squad_name_input.keypress(function(e) {
        if (e.which === 13) {
          _this.squad_name_save_button.click();
          return false;
        }
      });
      this.squad_name_input.change(function(e) {
        return _this.backend_status.fadeOut('slow');
      });
      this.squad_name_input.blur(function(e) {
        _this.squad_name_input.change();
        return _this.squad_name_save_button.click();
      });
      this.squad_name_display.click(function(e) {
        e.preventDefault();
        _this.squad_name_display.hide();
        _this.squad_name_input.val($.trim(_this.current_squad.name));
        window.setTimeout(function() {
          _this.squad_name_input.focus();
          return _this.squad_name_input.select();
        }, 100);
        return _this.squad_name_input.closest('div').show();
      });
      this.squad_name_save_button.click(function(e) {
        var name;
        e.preventDefault();
        _this.current_squad.dirty = true;
        _this.container.trigger('xwing-backend:squadDirtinessChanged');
        name = _this.current_squad.name = $.trim(_this.squad_name_input.val());
        if (name.length > 0) {
          _this.squad_name_display.show();
          _this.container.trigger('xwing-backend:squadNameChanged');
          return _this.squad_name_input.closest('div').hide();
        }
      });
      this.randomizer_options_modal = $(document.createElement('DIV'));
      this.randomizer_options_modal.addClass('modal hide fade');
      $(document).append(this.randomizer_options_modal);
      this.randomizer_options_modal.append($.trim("<div class=\"modal-header\">\n    <button type=\"button\" class=\"close\" data-dismiss=\"modal\" aria-hidden=\"true\">&times;</button>\n    <h3>Random Squad Builder Options</h3>\n</div>\n<div class=\"modal-body\">\n    <form>\n        <label>\n            Desired Points\n            <input type=\"number\" class=\"randomizer-points\" value=\"" + DEFAULT_RANDOMIZER_POINTS + "\" placeholder=\"" + DEFAULT_RANDOMIZER_POINTS + "\" />\n        </label>\n        <label>\n            Sets and Expansions (default all)\n            <select class=\"randomizer-sources\" multiple=\"1\" data-placeholder=\"Use all sets and expansions\">\n            </select>\n        </label>\n        <label>\n            Maximum Seconds to Spend Randomizing\n            <input type=\"number\" class=\"randomizer-timeout\" value=\"" + DEFAULT_RANDOMIZER_TIMEOUT_SEC + "\" placeholder=\"" + DEFAULT_RANDOMIZER_TIMEOUT_SEC + "\" />\n        </label>\n        <label>\n            Maximum Randomization Iterations\n            <input type=\"number\" class=\"randomizer-iterations\" value=\"" + DEFAULT_RANDOMIZER_ITERATIONS + "\" placeholder=\"" + DEFAULT_RANDOMIZER_ITERATIONS + "\" />\n        </label>\n    </form>\n</div>\n<div class=\"modal-footer\">\n    <button class=\"btn btn-primary do-randomize\" aria-hidden=\"true\">Randomize!</button>\n    <button class=\"btn\" data-dismiss=\"modal\" aria-hidden=\"true\">Close</button>\n</div>"));
      this.randomizer_source_selector = $(this.randomizer_options_modal.find('select.randomizer-sources'));
      _ref = exportObj.expansions;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        expansion = _ref[_i];
        opt = $(document.createElement('OPTION'));
        opt.text(expansion);
        this.randomizer_source_selector.append(opt);
      }
      this.randomizer_source_selector.select2({
        width: "100%",
        minimumResultsForSearch: $.isMobile() ? -1 : 0
      });
      this.randomize_button.click(function(e) {
        var iterations, points, timeout_sec;
        e.preventDefault();
        if (_this.current_squad.dirty && (_this.backend != null)) {
          return _this.backend.warnUnsaved(_this, function() {
            return _this.randomize_button.click();
          });
        } else {
          points = parseInt($(_this.randomizer_options_modal.find('.randomizer-points')).val());
          if (isNaN(points) || points <= 0) {
            points = DEFAULT_RANDOMIZER_POINTS;
          }
          timeout_sec = parseInt($(_this.randomizer_options_modal.find('.randomizer-timeout')).val());
          if (isNaN(timeout_sec) || timeout_sec <= 0) {
            timeout_sec = DEFAULT_RANDOMIZER_TIMEOUT_SEC;
          }
          iterations = parseInt($(_this.randomizer_options_modal.find('.randomizer-iterations')).val());
          if (isNaN(iterations) || iterations <= 0) {
            iterations = DEFAULT_RANDOMIZER_ITERATIONS;
          }
          return _this.randomSquad(points, _this.randomizer_source_selector.val(), DEFAULT_RANDOMIZER_TIMEOUT_SEC * 1000, iterations);
        }
      });
      this.randomizer_options_modal.find('button.do-randomize').click(function(e) {
        e.preventDefault();
        _this.randomizer_options_modal.modal('hide');
        return _this.randomize_button.click();
      });
      this.customize_randomizer.click(function(e) {
        e.preventDefault();
        return _this.randomizer_options_modal.modal();
      });
      this.backend_list_squads_button = $(this.container.find('button.backend-list-my-squads'));
      this.backend_list_squads_button.click(function(e) {
        e.preventDefault();
        if (_this.backend != null) {
          return _this.backend.list(_this);
        }
      });
      this.backend_save_list_button = $(this.container.find('button.save-list'));
      this.backend_save_list_button.click(function(e) {
        var additional_data, results, ___iced_passed_deferral, __iced_deferrals, __iced_k;
        __iced_k = __iced_k_noop;
        ___iced_passed_deferral = iced.findDeferral(arguments);
        e.preventDefault();
        if ((_this.backend != null) && !$(e.target).hasClass('disabled')) {
          additional_data = {
            points: _this.total_points,
            description: _this.describeSquad(),
            cards: _this.listCards()
          };
          _this.backend_status.html($.trim("<i class=\"icon-refresh icon-spin\"></i>&nbsp;Saving squad..."));
          _this.backend_status.show();
          _this.backend_save_list_button.addClass('disabled');
          (function(__iced_k) {
            __iced_deferrals = new iced.Deferrals(__iced_k, {
              parent: ___iced_passed_deferral
            });
            _this.backend.save(_this.serialize(), _this.current_squad.id, _this.current_squad.name, _this.faction, additional_data, __iced_deferrals.defer({
              assign_fn: (function() {
                return function() {
                  return results = arguments[0];
                };
              })(),
              lineno: 315
            }));
            __iced_deferrals._fulfill();
          })(function() {
            return __iced_k(results.success ? (_this.current_squad.dirty = false, _this.current_squad.id != null ? _this.backend_status.html($.trim("<i class=\"icon-ok\"></i>&nbsp;Squad updated successfully.")) : (_this.backend_status.html($.trim("<i class=\"icon-ok\"></i>&nbsp;New squad saved successfully.")), _this.current_squad.id = results.id), _this.container.trigger('xwing-backend:squadDirtinessChanged')) : (_this.backend_status.html($.trim("<i class=\"icon-exclamation-sign\"></i>&nbsp;" + results.error)), _this.backend_save_list_button.removeClass('disabled')));
          });
        } else {
          return __iced_k();
        }
      });
      this.backend_save_list_as_button = $(this.container.find('button.save-list-as'));
      this.backend_save_list_as_button.click(function(e) {
        e.preventDefault();
        if ((_this.backend != null) && !$(e.target).hasClass('disabled')) {
          return _this.backend.showSaveAsModal(_this);
        }
      });
      this.backend_delete_list_button = $(this.container.find('button.delete-list'));
      this.backend_delete_list_button.click(function(e) {
        e.preventDefault();
        if ((_this.backend != null) && !$(e.target).hasClass('disabled')) {
          return _this.backend.showDeleteModal(_this);
        }
      });
      content_container = $(document.createElement('DIV'));
      content_container.addClass('container-fluid');
      this.container.append(content_container);
      content_container.append($.trim("<div class=\"row-fluid\">\n    <div class=\"span9 ship-container\" />\n    <div class=\"span3 hidden-phone info-container\" />\n</div>"));
      this.ship_container = $(content_container.find('div.ship-container'));
      this.info_container = $(content_container.find('div.info-container'));
      this.info_container.append($.trim("<div class=\"well well-small info-well\">\n    <span class=\"info-name\"></span>\n    <table>\n        <tbody>\n            <tr class=\"info-ship\">\n                <td>Ship</td>\n                <td class=\"info-data\"></td>\n            </tr>\n            <tr class=\"info-skill\">\n                <td>Skill</td>\n                <td class=\"info-data info-skill\"></td>\n            </tr>\n            <tr class=\"info-attack\">\n                <td><img class=\"icon-attack\" src=\"images/transparent.png\" alt=\"Attack\" /></td>\n                <td class=\"info-data info-attack\"></td>\n            </tr>\n            <tr class=\"info-range\">\n                <td>Range</td>\n                <td class=\"info-data info-range\"></td>\n            </tr>\n            <tr class=\"info-agility\">\n                <td><img class=\"icon-agility\" src=\"images/transparent.png\" alt=\"Agility\" /></td>\n                <td class=\"info-data info-agility\"></td>\n            </tr>\n            <tr class=\"info-hull\">\n                <td><img class=\"icon-hull\" src=\"images/transparent.png\" alt=\"Hull\" /></td>\n                <td class=\"info-data info-hull\"></td>\n            </tr>\n            <tr class=\"info-shields\">\n                <td><img class=\"icon-shields\" src=\"images/transparent.png\" alt=\"Shields\" /></td>\n                <td class=\"info-data info-shields\"></td>\n            </tr>\n            <tr class=\"info-actions\">\n                <td>Actions</td>\n                <td class=\"info-data\"></td>\n            </tr>\n            <tr class=\"info-upgrades\">\n                <td>Upgrades</td>\n                <td class=\"info-data\"></td>\n            </tr>\n        </tbody>\n    </table>\n    <p class=\"info-text\" />\n</div>"));
      this.info_container.hide();
      this.print_list_button = $(this.container.find('button.print-list'));
      return this.container.find('[rel=tooltip]').tooltip();
    };

    SquadBuilder.prototype.setupEventHandlers = function() {
      var _this = this;
      this.container.on('xwing:claimUnique', function(e, unique, type, cb) {
        return _this.claimUnique(unique, type, cb);
      }).on('xwing:releaseUnique', function(e, unique, type, cb) {
        return _this.releaseUnique(unique, type, cb);
      }).on('xwing:pointsUpdated', function(e, cb) {
        if (cb == null) {
          cb = $.noop;
        }
        return _this.onPointsUpdated(cb);
      }).on('xwing-backend:squadLoadRequested', function(e, squad) {
        return _this.onSquadLoadRequested(squad);
      }).on('xwing-backend:squadDirtinessChanged', function(e) {
        return _this.onSquadDirtinessChanged();
      }).on('xwing-backend:squadNameChanged', function(e) {
        return _this.onSquadNameChanged();
      });
      $(window).on('xwing-backend:authenticationChanged', function(e) {
        return _this.resetCurrentSquad();
      });
      this.view_list_button.click(function(e) {
        e.preventDefault();
        return _this.showTextListModal();
      });
      this.print_list_button.click(function(e) {
        var ship, _i, _len, _ref;
        e.preventDefault();
        _this.printable_container.find('.printable-header').html(_this.list_modal.find('.modal-header').html());
        _this.printable_container.find('.printable-body').html(_this.list_modal.find('.modal-body').html());
        _this.printable_container.find('.printable-body').text('');
        _ref = _this.ships;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          ship = _ref[_i];
          if (ship.pilot != null) {
            _this.printable_container.find('.printable-body').append(ship.toHTML());
          }
        }
        return window.print();
      });
      return this.list_modal.on('shown', function(e) {
        return _this.list_modal.find('.mask.movable').css('right', 50 - $('.fancy-list').width());
      });
    };

    SquadBuilder.prototype.onPointsUpdated = function(cb) {
      var i, ship, _i, _j, _len, _len1, _ref, _ref1;
      this.total_points = 0;
      _ref = this.ships;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        ship = _ref[i];
        this.total_points += ship.getPoints();
      }
      this.points_container.text("Total Points: " + this.total_points);
      this.fancy_total_points_container.text(this.total_points);
      this.permalink.attr('href', "" + (window.location.href.split('?')[0]) + "?f=" + (encodeURI(this.faction)) + "&d=" + (encodeURI(this.serialize())));
      this.fancy_container.text('');
      _ref1 = this.ships;
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        ship = _ref1[_j];
        if (ship.pilot != null) {
          this.fancy_container.append(ship.toHTML());
        }
      }
      return cb(this.total_points);
    };

    SquadBuilder.prototype.onSquadLoadRequested = function(squad) {
      this.current_squad = squad;
      this.current_squad.dirty = false;
      this.container.trigger('xwing-backend:squadDirtinessChanged');
      this.backend_delete_list_button.removeClass('disabled');
      this.squad_name_input.val(this.current_squad.name);
      this.squad_name_placeholder.text(this.current_squad.name);
      return this.loadFromSerialized(squad.serialized);
    };

    SquadBuilder.prototype.onSquadDirtinessChanged = function() {
      if (this.current_squad.dirty) {
        this.backend_save_list_button.removeClass('disabled');
      } else {
        this.backend_save_list_button.addClass('disabled');
      }
      if (this.current_squad.id != null) {
        return this.backend_delete_list_button.removeClass('disabled');
      } else {
        return this.backend_delete_list_button.addClass('disabled');
      }
    };

    SquadBuilder.prototype.onSquadNameChanged = function() {
      var short_name;
      if (this.current_squad.name.length > SQUAD_DISPLAY_NAME_MAX_LENGTH) {
        short_name = "" + (this.current_squad.name.substr(0, SQUAD_DISPLAY_NAME_MAX_LENGTH)) + "&hellip;";
      } else {
        short_name = this.current_squad.name;
      }
      this.squad_name_placeholder.text('');
      this.squad_name_placeholder.append(short_name);
      return this.squad_name_input.val(this.current_squad.name);
    };

    SquadBuilder.prototype.showTextListModal = function() {
      return this.list_modal.modal('show');
    };

    SquadBuilder.prototype.serialize = function() {
      var i, ship, slot, upgrade;
      return ((function() {
        var _i, _len, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _results;
        _ref = this.ships;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          ship = _ref[_i];
          if (ship.pilot != null) {
            _results.push("" + ship.pilot.id + ":" + ((function() {
              var _j, _len1, _ref1, _ref2, _ref3, _results1;
              _ref1 = ship.pilot.slots;
              _results1 = [];
              for (i = _j = 0, _len1 = _ref1.length; _j < _len1; i = ++_j) {
                slot = _ref1[i];
                _results1.push((_ref2 = (_ref3 = ship.upgrades[i].data) != null ? _ref3.id : void 0) != null ? _ref2 : -1);
              }
              return _results1;
            })()) + ":" + ((_ref1 = (_ref2 = ship.title) != null ? (_ref3 = _ref2.data) != null ? _ref3.id : void 0 : void 0) != null ? _ref1 : -1) + ":" + ((function() {
              var _j, _len1, _ref4, _ref5, _ref6, _ref7, _ref8, _results1;
              _ref6 = (_ref4 = (_ref5 = ship.title) != null ? _ref5.conferredUpgrades : void 0) != null ? _ref4 : [];
              _results1 = [];
              for (_j = 0, _len1 = _ref6.length; _j < _len1; _j++) {
                upgrade = _ref6[_j];
                _results1.push((_ref7 = (_ref8 = upgrade.data) != null ? _ref8.id : void 0) != null ? _ref7 : -1);
              }
              return _results1;
            })()) + ":" + ((_ref4 = (_ref5 = ship.modification) != null ? (_ref6 = _ref5.data) != null ? _ref6.id : void 0 : void 0) != null ? _ref4 : -1));
          }
        }
        return _results;
      }).call(this)).join(';');
    };

    SquadBuilder.prototype.loadFromSerialized = function(serialized) {
      var i, modification_id, new_ship, pilot_id, ship_str, title_conferred_upgrade_ids, title_id, upgrade_id, upgrade_ids, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2, _ref3;
      this.suppress_automatic_new_ship = true;
      while (this.ships.length > 0) {
        this.removeShip(this.ships[0]);
      }
      if (this.ships.length > 0) {
        throw "Ships not emptied";
      }
      _ref = serialized.split(';');
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        ship_str = _ref[_i];
        _ref1 = ship_str.split(':'), pilot_id = _ref1[0], upgrade_ids = _ref1[1], title_id = _ref1[2], title_conferred_upgrade_ids = _ref1[3], modification_id = _ref1[4];
        new_ship = this.addShip();
        new_ship.setPilotById(parseInt(pilot_id));
        _ref2 = upgrade_ids.split(',');
        for (i = _j = 0, _len1 = _ref2.length; _j < _len1; i = ++_j) {
          upgrade_id = _ref2[i];
          upgrade_id = parseInt(upgrade_id);
          if (upgrade_id >= 0) {
            new_ship.upgrades[i].setById(upgrade_id);
          }
        }
        title_id = parseInt(title_id);
        if (title_id >= 0) {
          new_ship.title.setById(title_id);
        }
        if ((new_ship.title != null) && new_ship.title.conferredUpgrades.length > 0) {
          _ref3 = title_conferred_upgrade_ids.split(',');
          for (i = _k = 0, _len2 = _ref3.length; _k < _len2; i = ++_k) {
            upgrade_id = _ref3[i];
            upgrade_id = parseInt(upgrade_id);
            if (upgrade_id >= 0) {
              new_ship.title.conferredUpgrades[i].setById(upgrade_id);
            }
          }
        }
        modification_id = parseInt(modification_id);
        if (modification_id >= 0) {
          new_ship.modification.setById(modification_id);
        }
        new_ship.updateSelections();
      }
      this.suppress_automatic_new_ship = false;
      return this.addShip();
    };

    SquadBuilder.prototype.uniqueIndex = function(unique, type) {
      if (!(type in this.uniques_in_use)) {
        throw "Invalid unique type '" + type + "'";
      }
      return this.uniques_in_use[type].indexOf(unique);
    };

    SquadBuilder.prototype.claimUnique = function(unique, type, cb) {
      var crew, pilot;
      if (this.uniqueIndex(unique, type) < 0) {
        if (type === 'Pilot') {
          crew = exportObj.upgrades[unique.name];
          if ((crew != null) && ((crew != null ? crew.unique : void 0) != null)) {
            if (this.uniqueIndex(crew, 'Upgrade') < 0) {
              this.uniques_in_use['Upgrade'].push(crew);
            } else {
              throw "Unique " + type + " '" + unique.name + "' already claimed as crew";
            }
          }
        } else if (type === 'Upgrade' && unique.slot === 'Crew') {
          pilot = exportObj.pilots[unique.name];
          if ((pilot != null) && ((pilot != null ? pilot.unique : void 0) != null)) {
            if (this.uniqueIndex(pilot, 'Pilot') < 0) {
              this.uniques_in_use['Pilot'].push(pilot);
            } else {
              throw "Unique " + type + " '" + unique.name + "' already claimed as pilot";
            }
          }
        }
        this.uniques_in_use[type].push(unique);
      } else {
        throw "Unique " + type + " '" + unique.name + "' already claimed";
      }
      return cb();
    };

    SquadBuilder.prototype.releaseUnique = function(unique, type, cb) {
      var crew, idx, pilot;
      idx = this.uniqueIndex(unique, type);
      if (idx >= 0) {
        this.uniques_in_use[type].splice(idx, 1);
        if (type === 'Pilot') {
          crew = exportObj.upgrades[unique.name];
          if ((crew != null) && ((crew != null ? crew.unique : void 0) != null)) {
            idx = this.uniqueIndex(crew, 'Upgrade');
            if (idx < 0) {
              throw "Unique crew accompanying " + unique.name + " was not also claimed!";
            }
            this.uniques_in_use['Upgrade'].splice(idx, 1);
          }
        } else if (type === 'Upgrade' && unique.slot === 'Crew') {
          pilot = exportObj.pilots[unique.name];
          if ((pilot != null) && ((pilot != null ? pilot.unique : void 0) != null)) {
            idx = this.uniqueIndex(pilot, 'Pilot');
            if (idx < 0) {
              throw "Unique pilot accompanying " + unique.name + " was not also claimed!";
            }
            this.uniques_in_use['Pilot'].splice(idx, 1);
          }
        }
      } else {
        throw "Unique " + type + " '" + unique.name + "' not in use";
      }
      return cb();
    };

    SquadBuilder.prototype.addShip = function() {
      var new_ship;
      new_ship = new Ship({
        builder: this,
        container: this.ship_container
      });
      this.ships.push(new_ship);
      return new_ship;
    };

    SquadBuilder.prototype.removeShip = function(ship) {
      var ___iced_passed_deferral, __iced_deferrals, __iced_k,
        _this = this;
      __iced_k = __iced_k_noop;
      ___iced_passed_deferral = iced.findDeferral(arguments);
      (function(__iced_k) {
        __iced_deferrals = new iced.Deferrals(__iced_k, {
          parent: ___iced_passed_deferral,
          funcname: "SquadBuilder.removeShip"
        });
        ship.destroy(__iced_deferrals.defer({
          lineno: 591
        }));
        __iced_deferrals._fulfill();
      })(function() {
        __iced_deferrals = new iced.Deferrals(__iced_k, {
          parent: ___iced_passed_deferral,
          funcname: "SquadBuilder.removeShip"
        });
        _this.container.trigger('xwing:pointsUpdated', __iced_deferrals.defer({
          lineno: 592
        }));
        __iced_deferrals._fulfill();
      });
    };

    SquadBuilder.prototype.matcher = function(item, term) {
      return item.toUpperCase().indexOf(term.toUpperCase()) >= 0;
    };

    SquadBuilder.prototype.getAvailablePilotsIncluding = function(include_pilot, term) {
      var pilot, pilot_name, result_pilot, result_pilots_by_ship, results, ship, unclaimed_faction_pilots, _i, _j, _len, _len1, _ref, _ref1;
      if (term == null) {
        term = '';
      }
      unclaimed_faction_pilots = (function() {
        var _ref, _results;
        _ref = exportObj.pilots;
        _results = [];
        for (pilot_name in _ref) {
          pilot = _ref[pilot_name];
          if (exportObj.ships[pilot.ship].faction === this.faction && this.matcher(pilot_name, term) && ((pilot.unique == null) || __indexOf.call(this.uniques_in_use['Pilot'], pilot) < 0)) {
            _results.push(pilot);
          }
        }
        return _results;
      }).call(this);
      if ((include_pilot != null) && (include_pilot.unique != null) && this.matcher(include_pilot.name, term)) {
        unclaimed_faction_pilots.push(include_pilot);
      }
      result_pilots_by_ship = {};
      _ref = (function() {
        var _j, _len, _results;
        _results = [];
        for (_j = 0, _len = unclaimed_faction_pilots.length; _j < _len; _j++) {
          pilot = unclaimed_faction_pilots[_j];
          _results.push({
            id: pilot.id,
            text: "" + pilot.name + " (" + pilot.points + ")",
            points: pilot.points,
            ship: pilot.ship
          });
        }
        return _results;
      })();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        result_pilot = _ref[_i];
        if (!(result_pilot.ship in result_pilots_by_ship)) {
          result_pilots_by_ship[result_pilot.ship] = [];
        }
        result_pilots_by_ship[result_pilot.ship].push(result_pilot);
      }
      results = [];
      _ref1 = Object.keys(result_pilots_by_ship).sort();
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        ship = _ref1[_j];
        results.push({
          text: ship,
          children: result_pilots_by_ship[ship].sort(exportObj.sortHelper)
        });
      }
      return results;
    };

    SquadBuilder.prototype.getAvailableUpgradesIncluding = function(slot, include_upgrade, term) {
      var unclaimed_upgrades, upgrade, upgrade_name;
      if (term == null) {
        term = '';
      }
      unclaimed_upgrades = (function() {
        var _ref, _results;
        _ref = exportObj.upgrades;
        _results = [];
        for (upgrade_name in _ref) {
          upgrade = _ref[upgrade_name];
          if (upgrade.slot === slot && this.matcher(upgrade_name, term) && ((upgrade.unique == null) || __indexOf.call(this.uniques_in_use['Upgrade'], upgrade) < 0) && ((upgrade.faction == null) || upgrade.faction === this.faction)) {
            _results.push(upgrade);
          }
        }
        return _results;
      }).call(this);
      if ((include_upgrade != null) && (include_upgrade.unique != null) && this.matcher(include_upgrade.name, term)) {
        unclaimed_upgrades.push(include_upgrade);
      }
      return ((function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = unclaimed_upgrades.length; _i < _len; _i++) {
          upgrade = unclaimed_upgrades[_i];
          _results.push({
            id: upgrade.id,
            text: "" + upgrade.name + " (" + upgrade.points + ")",
            points: upgrade.points
          });
        }
        return _results;
      })()).sort(exportObj.sortHelper);
    };

    SquadBuilder.prototype.getAvailableModificationsIncluding = function(include_modification, ship, term) {
      var modification, modification_name, unclaimed_modifications;
      if (term == null) {
        term = '';
      }
      unclaimed_modifications = (function() {
        var _ref, _results;
        _ref = exportObj.modifications;
        _results = [];
        for (modification_name in _ref) {
          modification = _ref[modification_name];
          if (this.matcher(modification_name, term) && ((modification.unique == null) || __indexOf.call(this.uniques_in_use['Modification'], modification) < 0) && ((modification.faction == null) || modification.faction === this.faction) && (!((ship != null) && (modification.restriction_func != null)) || modification.restriction_func(ship))) {
            _results.push(modification);
          }
        }
        return _results;
      }).call(this);
      if ((include_modification != null) && (include_modification.unique != null) && this.matcher(include_modification.name, term)) {
        unclaimed_modifications.push(include_modification);
      }
      return ((function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = unclaimed_modifications.length; _i < _len; _i++) {
          modification = unclaimed_modifications[_i];
          _results.push({
            id: modification.id,
            text: "" + modification.name + " (" + modification.points + ")",
            points: modification.points
          });
        }
        return _results;
      })()).sort(exportObj.sortHelper);
    };

    SquadBuilder.prototype.getAvailableTitlesIncluding = function(ship_name, include_title, term) {
      var title, title_name, unclaimed_titles;
      if (term == null) {
        term = '';
      }
      unclaimed_titles = (function() {
        var _ref, _results;
        _ref = exportObj.titles;
        _results = [];
        for (title_name in _ref) {
          title = _ref[title_name];
          if (title.ship === ship_name && this.matcher(title_name, term) && __indexOf.call(this.uniques_in_use['Title'], title) < 0 && ((title.faction == null) || title.faction === this.faction)) {
            _results.push(title);
          }
        }
        return _results;
      }).call(this);
      if ((include_title != null) && this.matcher(include_title.name, term)) {
        unclaimed_titles.push(include_title);
      }
      return ((function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = unclaimed_titles.length; _i < _len; _i++) {
          title = unclaimed_titles[_i];
          _results.push({
            id: title.id,
            text: "" + title.name + " (" + title.points + ")",
            points: title.points
          });
        }
        return _results;
      })()).sort(exportObj.sortHelper);
    };

    SquadBuilder.prototype.showTooltip = function(type, data) {
      var ship, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8;
      if (data !== this.tooltip_currently_displaying) {
        this.info_container.find('.info-name').html("" + (data.unique ? "&middot;&nbsp;" : "") + data.name);
        this.info_container.find('p.info-text').html((_ref = data.text) != null ? _ref : '');
        switch (type) {
          case 'Pilot':
            ship = exportObj.ships[data.ship];
            this.info_container.find('tr.info-ship td.info-data').text(data.ship);
            this.info_container.find('tr.info-ship').show();
            this.info_container.find('tr.info-skill td.info-data').text(data.skill);
            this.info_container.find('tr.info-skill').show();
            this.info_container.find('tr.info-attack td.info-data').text((_ref1 = (_ref2 = data.ship_override) != null ? _ref2.attack : void 0) != null ? _ref1 : ship.attack);
            this.info_container.find('tr.info-attack').show();
            this.info_container.find('tr.info-range').hide();
            this.info_container.find('tr.info-agility td.info-data').text((_ref3 = (_ref4 = data.ship_override) != null ? _ref4.agility : void 0) != null ? _ref3 : ship.agility);
            this.info_container.find('tr.info-agility').show();
            this.info_container.find('tr.info-hull td.info-data').text((_ref5 = (_ref6 = data.ship_override) != null ? _ref6.hull : void 0) != null ? _ref5 : ship.hull);
            this.info_container.find('tr.info-hull').show();
            this.info_container.find('tr.info-shields td.info-data').text((_ref7 = (_ref8 = data.ship_override) != null ? _ref8.shields : void 0) != null ? _ref7 : ship.shields);
            this.info_container.find('tr.info-shields').show();
            this.info_container.find('tr.info-actions td.info-data').text(exportObj.ships[data.ship].actions.join(', '));
            this.info_container.find('tr.info-actions').show();
            this.info_container.find('tr.info-upgrades').show();
            this.info_container.find('tr.info-upgrades td.info-data').text(data.slots.join(', ') || 'None');
            break;
          case 'Addon':
            this.info_container.find('tr.info-ship').hide();
            this.info_container.find('tr.info-skill').hide();
            if (data.attack != null) {
              this.info_container.find('tr.info-attack td.info-data').text(data.attack);
              this.info_container.find('tr.info-attack').show();
            } else {
              this.info_container.find('tr.info-attack').hide();
            }
            if (data.range != null) {
              this.info_container.find('tr.info-range td.info-data').text(data.range);
              this.info_container.find('tr.info-range').show();
            } else {
              this.info_container.find('tr.info-range').hide();
            }
            this.info_container.find('tr.info-agility').hide();
            this.info_container.find('tr.info-hull').hide();
            this.info_container.find('tr.info-shields').hide();
            this.info_container.find('tr.info-actions').hide();
            this.info_container.find('tr.info-upgrades').hide();
        }
        this.info_container.show();
        return this.tooltip_currently_displaying = data;
      }
    };

    SquadBuilder.prototype._randomizerLoopBody = function(data) {
      var addon, available_modifications, available_pilots, available_titles, available_upgrades, idx, modification, new_ship, pilot, removable_things, ship, ship_group, thing_to_remove, title, unused_addons, upgrade, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _m, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6;
      if (data.keep_running && data.iterations < data.max_iterations) {
        data.iterations++;
        if (this.total_points === data.max_points) {
          data.keep_running = false;
        } else if (this.total_points < data.max_points) {
          unused_addons = [];
          _ref = this.ships;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            ship = _ref[_i];
            _ref1 = ship.upgrades;
            for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
              upgrade = _ref1[_j];
              if (upgrade.data == null) {
                unused_addons.push(upgrade);
              }
            }
            if ((ship.title != null) && (ship.title.data == null)) {
              unused_addons.push(ship.title);
            }
            if ((ship.modification != null) && (ship.modification.data == null)) {
              unused_addons.push(ship.modification);
            }
          }
          idx = $.randomInt(1 + unused_addons.length);
          if (idx === 0) {
            available_pilots = this.getAvailablePilotsIncluding();
            ship_group = available_pilots[$.randomInt(available_pilots.length)];
            pilot = ship_group.children[$.randomInt(ship_group.children.length)];
            if (exportObj.pilotsById[pilot.id].sources.intersects(data.allowed_sources)) {
              new_ship = this.addShip();
              new_ship.setPilotById(pilot.id);
            }
          } else {
            addon = unused_addons[idx - 1];
            switch (addon.type) {
              case 'Upgrade':
                available_upgrades = (function() {
                  var _k, _len2, _ref2, _results;
                  _ref2 = this.getAvailableUpgradesIncluding(addon.slot);
                  _results = [];
                  for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
                    upgrade = _ref2[_k];
                    if (exportObj.upgradesById[upgrade.id].sources.intersects(data.allowed_sources)) {
                      _results.push(upgrade);
                    }
                  }
                  return _results;
                }).call(this);
                if (available_upgrades.length > 0) {
                  addon.setById(available_upgrades[$.randomInt(available_upgrades.length)].id);
                }
                break;
              case 'Title':
                available_titles = (function() {
                  var _k, _len2, _ref2, _results;
                  _ref2 = this.getAvailableTitlesIncluding(addon.ship.name);
                  _results = [];
                  for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
                    title = _ref2[_k];
                    if (exportObj.titlesById[title.id].sources.intersects(data.allowed_sources)) {
                      _results.push(title);
                    }
                  }
                  return _results;
                }).call(this);
                if (available_titles.length > 0) {
                  addon.setById(available_titles[$.randomInt(available_titles.length)].id);
                }
                break;
              case 'Modification':
                available_modifications = (function() {
                  var _k, _len2, _ref2, _results;
                  _ref2 = this.getAvailableModificationsIncluding(null, addon.ship.data);
                  _results = [];
                  for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
                    modification = _ref2[_k];
                    if (exportObj.modificationsById[modification.id].sources.intersects(data.allowed_sources)) {
                      _results.push(modification);
                    }
                  }
                  return _results;
                }).call(this);
                if (available_modifications.length > 0) {
                  addon.setById(available_modifications[$.randomInt(available_modifications.length)].id);
                }
                break;
              default:
                throw "Invalid addon type " + addon.type;
            }
          }
        } else {
          removable_things = [];
          _ref2 = this.ships;
          for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
            ship = _ref2[_k];
            removable_things.push(ship);
            _ref3 = ship.upgrades;
            for (_l = 0, _len3 = _ref3.length; _l < _len3; _l++) {
              upgrade = _ref3[_l];
              if (upgrade.data != null) {
                removable_things.push(upgrade);
              }
            }
            if (((_ref4 = ship.title) != null ? _ref4.data : void 0) != null) {
              removable_things.push(ship.title);
            }
            if (((_ref5 = ship.modification) != null ? _ref5.data : void 0) != null) {
              removable_things.push(ship.modification);
            }
          }
          if (removable_things.length > 0) {
            thing_to_remove = removable_things[$.randomInt(removable_things.length)];
            if (thing_to_remove instanceof Ship) {
              this.removeShip(thing_to_remove);
            } else if (thing_to_remove instanceof GenericAddon) {
              thing_to_remove.setData(null);
            } else {
              throw "Unknown thing to remove " + thing_to_remove;
            }
          }
        }
        return window.setTimeout(this._makeRandomizerLoopFunc(data), 0);
      } else {
        window.clearTimeout(data.timer);
        _ref6 = this.ships;
        for (_m = 0, _len4 = _ref6.length; _m < _len4; _m++) {
          ship = _ref6[_m];
          ship.updateSelections();
        }
        this.suppress_automatic_new_ship = false;
        return this.addShip();
      }
    };

    SquadBuilder.prototype._makeRandomizerLoopFunc = function(data) {
      var _this = this;
      return function() {
        return _this._randomizerLoopBody(data);
      };
    };

    SquadBuilder.prototype.randomSquad = function(max_points, allowed_sources, timeout_ms, max_iterations) {
      var data, stopHandler,
        _this = this;
      if (max_points == null) {
        max_points = 100;
      }
      if (allowed_sources == null) {
        allowed_sources = null;
      }
      if (timeout_ms == null) {
        timeout_ms = 1000;
      }
      if (max_iterations == null) {
        max_iterations = 1000;
      }
      this.backend_status.fadeOut('slow');
      this.suppress_automatic_new_ship = true;
      while (this.ships.length > 0) {
        this.removeShip(this.ships[0]);
      }
      if (this.ships.length > 0) {
        throw "Ships not emptied";
      }
      data = {
        iterations: 0,
        max_points: max_points,
        allowed_sources: allowed_sources,
        max_iterations: max_iterations,
        keep_running: true,
        allowed_sources: allowed_sources != null ? allowed_sources : exportObj.expansions
      };
      stopHandler = function() {
        return data.keep_running = false;
      };
      data.timer = window.setTimeout(stopHandler, timeout_ms);
      window.setTimeout(this._makeRandomizerLoopFunc(data), 0);
      this.resetCurrentSquad();
      this.current_squad.name = 'Random Squad';
      return this.container.trigger('xwing-backend:squadNameChanged');
    };

    SquadBuilder.prototype.setBackend = function(backend) {
      return this.backend = backend;
    };

    SquadBuilder.prototype.describeSquad = function() {
      var ship;
      return ((function() {
        var _i, _len, _ref, _results;
        _ref = this.ships;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          ship = _ref[_i];
          if (ship.pilot != null) {
            _results.push(ship.pilot.name);
          }
        }
        return _results;
      }).call(this)).join(', ');
    };

    SquadBuilder.prototype.listCards = function() {
      var card_obj, ship, upgrade, _i, _j, _len, _len1, _ref, _ref1, _ref2, _ref3;
      card_obj = {};
      _ref = this.ships;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        ship = _ref[_i];
        if (ship.pilot != null) {
          card_obj[ship.pilot.name] = null;
          _ref1 = ship.upgrades;
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            upgrade = _ref1[_j];
            if (upgrade.data != null) {
              card_obj[upgrade.data.name] = null;
            }
          }
          if (((_ref2 = ship.title) != null ? _ref2.data : void 0) != null) {
            card_obj[ship.title.data.name] = null;
          }
          if (((_ref3 = ship.modification) != null ? _ref3.data : void 0) != null) {
            card_obj[ship.modification.data.name] = null;
          }
        }
      }
      return Object.keys(card_obj).sort();
    };

    return SquadBuilder;

  })();

  Ship = (function() {
    function Ship(args) {
      this.builder = args.builder;
      this.container = args.container;
      this.pilot = null;
      this.data = null;
      this.upgrades = [];
      this.modification = null;
      this.title = null;
      this.setupUI();
    }

    Ship.prototype.destroy = function(cb) {
      var idx;
      this.resetPilot();
      this.resetAddons();
      this.teardownUI();
      idx = this.builder.ships.indexOf(this);
      if (idx < 0) {
        throw "Ship not registered with builder";
      }
      this.builder.ships.splice(idx, 1);
      return cb();
    };

    Ship.prototype.setPilotById = function(id) {
      return this.setPilot(exportObj.pilotsById[parseInt(id)]);
    };

    Ship.prototype.setPilotByName = function(name) {
      return this.setPilot(exportObj.pilots[$.trim(name)]);
    };

    Ship.prototype.setPilot = function(new_pilot) {
      var cls, ___iced_passed_deferral, __iced_deferrals, __iced_k,
        _this = this;
      __iced_k = __iced_k_noop;
      ___iced_passed_deferral = iced.findDeferral(arguments);
      if (new_pilot !== this.pilot) {
        if (this.pilot == null) {
          if (!this.builder.suppress_automatic_new_ship) {
            this.builder.addShip();
          }
          this.remove_button.fadeIn('fast');
        }
        this.resetPilot();
        this.resetAddons();
        this.data = exportObj.ships[new_pilot != null ? new_pilot.ship : void 0];
        (function(__iced_k) {
          if ((new_pilot != null ? new_pilot.unique : void 0) != null) {
            (function(__iced_k) {
              __iced_deferrals = new iced.Deferrals(__iced_k, {
                parent: ___iced_passed_deferral,
                funcname: "Ship.setPilot"
              });
              _this.builder.container.trigger('xwing:claimUnique', [
                new_pilot, 'Pilot', __iced_deferrals.defer({
                  lineno: 846
                })
              ]);
              __iced_deferrals._fulfill();
            })(__iced_k);
          } else {
            return __iced_k();
          }
        })(function() {
          var _i, _len, _ref;
          _this.pilot = new_pilot;
          if (_this.pilot != null) {
            _this.setupAddons();
          }
          _this.builder.container.trigger('xwing:pointsUpdated');
          _ref = _this.row.attr('class').split(' ');
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            cls = _ref[_i];
            if (cls.indexOf('ship-') === 0) {
              _this.row.removeClass(cls);
            }
          }
          return __iced_k(_this.row.addClass("ship-" + (_this.data.name.toLowerCase().replace(/[^a-z0-9]/gi, '')) + "0"));
        });
      } else {
        return __iced_k();
      }
    };

    Ship.prototype.resetPilot = function() {
      var ___iced_passed_deferral, __iced_deferrals, __iced_k,
        _this = this;
      __iced_k = __iced_k_noop;
      ___iced_passed_deferral = iced.findDeferral(arguments);
      (function(__iced_k) {
        var _ref;
        if (((_ref = _this.pilot) != null ? _ref.unique : void 0) != null) {
          (function(__iced_k) {
            __iced_deferrals = new iced.Deferrals(__iced_k, {
              parent: ___iced_passed_deferral,
              funcname: "Ship.resetPilot"
            });
            _this.builder.container.trigger('xwing:releaseUnique', [
              _this.pilot, 'Pilot', __iced_deferrals.defer({
                lineno: 858
              })
            ]);
            __iced_deferrals._fulfill();
          })(__iced_k);
        } else {
          return __iced_k();
        }
      })(function() {
        return _this.pilot = null;
      });
    };

    Ship.prototype.setupAddons = function() {
      var slot, _i, _len, _ref, _ref1;
      _ref1 = (_ref = this.pilot.slots) != null ? _ref : [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        slot = _ref1[_i];
        this.upgrades.push(new Upgrade({
          ship: this,
          container: this.addon_container,
          slot: slot
        }));
      }
      if (this.pilot.ship in exportObj.titlesByShip) {
        this.title = new Title({
          ship: this,
          container: this.addon_container
        });
      }
      return this.modification = new Modification({
        ship: this,
        container: this.addon_container
      });
    };

    Ship.prototype.resetAddons = function() {
      var i, upgrade, ___iced_passed_deferral, __iced_deferrals, __iced_k,
        _this = this;
      __iced_k = __iced_k_noop;
      ___iced_passed_deferral = iced.findDeferral(arguments);
      (function(__iced_k) {
        var _i, _len, _ref;
        __iced_deferrals = new iced.Deferrals(__iced_k, {
          parent: ___iced_passed_deferral,
          funcname: "Ship.resetAddons"
        });
        _ref = _this.upgrades;
        for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
          upgrade = _ref[i];
          upgrade.destroy(__iced_deferrals.defer({
            lineno: 881
          }));
        }
        if (_this.modification != null) {
          _this.modification.destroy(__iced_deferrals.defer({
            lineno: 882
          }));
        }
        if (_this.title != null) {
          _this.title.destroy(__iced_deferrals.defer({
            lineno: 883
          }));
        }
        __iced_deferrals._fulfill();
      })(function() {
        _this.upgrades = [];
        _this.modification = null;
        return _this.title = null;
      });
    };

    Ship.prototype.getPoints = function() {
      var points, upgrade, _i, _len, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6;
      points = ((_ref = (_ref1 = this.pilot) != null ? _ref1.points : void 0) != null ? _ref : 0) + ((_ref2 = (_ref3 = this.modification) != null ? _ref3.getPoints() : void 0) != null ? _ref2 : 0) + ((_ref4 = (_ref5 = this.title) != null ? _ref5.getPoints() : void 0) != null ? _ref4 : 0);
      _ref6 = this.upgrades;
      for (_i = 0, _len = _ref6.length; _i < _len; _i++) {
        upgrade = _ref6[_i];
        points += upgrade.getPoints();
      }
      this.points_container.text(points);
      if (this.pilot != null) {
        this.points_container.show();
      }
      return points;
    };

    Ship.prototype.updateSelections = function() {
      var upgrade, _i, _len, _ref;
      if (this.pilot != null) {
        this.pilot_selector.select2('data', {
          id: this.pilot.id,
          text: "" + this.pilot.name + " (" + this.pilot.points + ")"
        });
        _ref = this.upgrades;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          upgrade = _ref[_i];
          upgrade.updateSelection();
        }
        if (this.title != null) {
          this.title.updateSelection();
        }
        if (this.modification != null) {
          return this.modification.updateSelection();
        }
      } else {
        return this.pilot_selector.select2('data', null);
      }
    };

    Ship.prototype.setupUI = function() {
      var _this = this;
      this.row = $(document.createElement('DIV'));
      this.row.addClass('row-fluid ship');
      this.container.append(this.row);
      this.row.append($.trim('<div class="span3 pilot-selector-container">\n    <input type="hidden" />\n</div>\n<div class="span1 points-display-container">\n    <span></span>\n</div>\n<div class="span7 addon-container" />\n<div class="span1 remove-btn-container">\n    <button class="btn btn-danger"><span class="visible-desktop visible-tablet hidden-phone">&times;</span><span class="hidden-desktop hidden-tablet visible-phone">Remove Pilot</span></button>\n</div>'));
      this.pilot_selector = $(this.row.find('div.pilot-selector-container input[type=hidden]'));
      this.pilot_selector.select2({
        width: '100%',
        placeholder: 'Select a pilot',
        query: function(query) {
          return query.callback({
            more: false,
            results: _this.builder.getAvailablePilotsIncluding(_this.pilot, query.term)
          });
        },
        minimumResultsForSearch: $.isMobile() ? -1 : 0
      });
      this.pilot_selector.on('change', function(e) {
        _this.setPilotById(_this.pilot_selector.select2('val'));
        _this.builder.current_squad.dirty = true;
        _this.builder.container.trigger('xwing-backend:squadDirtinessChanged');
        return _this.builder.backend_status.fadeOut('slow');
      });
      this.pilot_selector.data('select2').results.on('mousemove-filtered', function(e) {
        var select2_data;
        select2_data = $(e.target).closest('.select2-result-selectable').data('select2-data');
        if ((select2_data != null ? select2_data.id : void 0) != null) {
          return _this.builder.showTooltip('Pilot', exportObj.pilotsById[select2_data.id]);
        }
      });
      this.pilot_selector.data('select2').container.on('mouseover', function(e) {
        if (_this.pilot != null) {
          return _this.builder.showTooltip('Pilot', _this.pilot);
        }
      });
      this.points_container = $(this.row.find('.points-display-container span'));
      this.points_container.hide();
      this.addon_container = $(this.row.find('div.addon-container'));
      this.remove_button = $(this.row.find('div.remove-btn-container button'));
      this.remove_button.click(function(e) {
        e.preventDefault();
        return _this.row.slideUp('fast', function() {
          _this.builder.removeShip(_this);
          return _this.backend_status.fadeOut('slow');
        });
      });
      return this.remove_button.hide();
    };

    Ship.prototype.teardownUI = function() {
      this.row.text('');
      return this.row.remove();
    };

    Ship.prototype.toString = function() {
      if (this.pilot != null) {
        return "Pilot " + this.pilot.name + " flying " + this.data.name;
      } else {
        return "Ship without pilot";
      }
    };

    Ship.prototype.toHTML = function() {
      /*
      if (upgrade for upgrade in ship.upgrades when upgrade.data?).length > 0 or ship.modification?.data? or ship.title?.data?
          addon_list = '<ul>'
          addon_list += "<li>#{ship.title.toString()}</li>" if ship.title?.data?
          for upgrade in ship.upgrades
              if upgrade.data?
                  addon_list += "<li>#{upgrade.toString()}</li>"
          addon_list += "<li>#{ship.modification.toString()}</li>" if ship.modification?.data?
          addon_list += '</ul>'
          total_points = "Total: #{ship.getPoints()}"
      else
          total_points = ''
          addon_list = ''
      */

      var action, action_bar, html, slotted_upgrades, upgrade, _i, _j, _len, _len1, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8;
      action_bar = "";
      _ref = exportObj.ships[this.data.name].actions;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        action = _ref[_i];
        action_bar += (function() {
          switch (action) {
            case 'Focus':
              return "<img class=\"icon-focus\" src=\"images/transparent.png\" />";
            case 'Evade':
              return "<img class=\"icon-evade\" src=\"images/transparent.png\" />";
            case 'Barrel Roll':
              return "<img class=\"icon-barrel-roll\" src=\"images/transparent.png\" />";
            case 'Target Lock':
              return "<img class=\"icon-target-lock\" src=\"images/transparent.png\" />";
            case 'Boost':
              return "<img class=\"icon-boost\" src=\"images/transparent.png\" />";
            default:
              return "<span>&nbsp;" + action + "<span>";
          }
        })();
      }
      html = $.trim("<div class=\"fancy-pilot-header\">\n    <div class=\"pilot-header-text\">" + this.pilot.name + " / " + this.data.name + "</div>\n    <div class=\"mask movable\">\n        <div class=\"outer-circle\">\n            <div class=\"inner-circle pilot-points\">" + this.pilot.points + "</div>\n        </div>\n    </div>\n</div>\n<div class=\"fancy-pilot-stats\">\n    <div class=\"pilot-stats-content\">\n        <span class=\"info-data info-skill\">" + this.pilot.skill + "</span>\n        <img class=\"icon-attack\" src=\"images/transparent.png\" />\n        <span class=\"info-data info-attack\">" + ((_ref1 = (_ref2 = this.pilot.ship_override) != null ? _ref2.attack : void 0) != null ? _ref1 : this.data.attack) + "</span>\n        <img class=\"icon-agility\" src=\"images/transparent.png\" />\n        <span class=\"info-data info-agility\">" + ((_ref3 = (_ref4 = this.pilot.ship_override) != null ? _ref4.agility : void 0) != null ? _ref3 : this.data.agility) + "</span>\n        <img class=\"icon-hull\" src=\"images/transparent.png\" />\n        <span class=\"info-data info-hull\">" + ((_ref5 = (_ref6 = this.pilot.ship_override) != null ? _ref6.hull : void 0) != null ? _ref5 : this.data.hull) + "</span>\n        <img class=\"icon-shields\" src=\"images/transparent.png\" />\n        <span class=\"info-data info-shields\">" + ((_ref7 = (_ref8 = this.pilot.ship_override) != null ? _ref8.shields : void 0) != null ? _ref7 : this.data.shields) + "</span>\n        &nbsp;\n        " + action_bar + "\n    </div>\n</div>");
      if (this.pilot.text) {
        html += $.trim("<div class=\"fancy-pilot-text\">" + this.pilot.text + "</div>");
      }
      slotted_upgrades = (function() {
        var _j, _len1, _ref9, _results;
        _ref9 = this.upgrades;
        _results = [];
        for (_j = 0, _len1 = _ref9.length; _j < _len1; _j++) {
          upgrade = _ref9[_j];
          if (upgrade.data != null) {
            _results.push(upgrade);
          }
        }
        return _results;
      }).call(this);
      if (slotted_upgrades.length > 0) {
        html += $.trim("<div class=\"fancy-upgrade-container\">");
        for (_j = 0, _len1 = slotted_upgrades.length; _j < _len1; _j++) {
          upgrade = slotted_upgrades[_j];
          html += upgrade.toHTML();
        }
        html += $.trim("</div>");
      }
      return "<div class=\"fancy-ship\">" + html + "</div>";
    };

    return Ship;

  })();

  GenericAddon = (function() {
    function GenericAddon(args) {
      this.ship = args.ship;
      this.container = $(args.container);
      this.data = null;
      this.type = null;
      this.dataByName = null;
      this.dataById = null;
    }

    GenericAddon.prototype.destroy = function() {
      var args, cb, ___iced_passed_deferral, __iced_deferrals, __iced_k,
        _this = this;
      __iced_k = __iced_k_noop;
      ___iced_passed_deferral = iced.findDeferral(arguments);
      cb = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      (function(__iced_k) {
        var _ref;
        if (((_ref = _this.data) != null ? _ref.unique : void 0) != null) {
          (function(__iced_k) {
            __iced_deferrals = new iced.Deferrals(__iced_k, {
              parent: ___iced_passed_deferral,
              funcname: "GenericAddon.destroy"
            });
            _this.ship.builder.container.trigger('xwing:releaseUnique', [
              _this.data, _this.type, __iced_deferrals.defer({
                lineno: 1064
              })
            ]);
            __iced_deferrals._fulfill();
          })(__iced_k);
        } else {
          return __iced_k();
        }
      })(function() {
        _this.selector.select2('destroy');
        return cb(args);
      });
    };

    GenericAddon.prototype.setupSelector = function(args) {
      var _this = this;
      this.selector = $(document.createElement('INPUT'));
      this.selector.attr('type', 'hidden');
      this.container.append(this.selector);
      if ($.isMobile()) {
        args.minimumResultsForSearch = -1;
      }
      this.selector.select2(args);
      this.selector.on('change', function(e) {
        _this.setById(_this.selector.select2('val'));
        _this.ship.builder.current_squad.dirty = true;
        _this.ship.builder.container.trigger('xwing-backend:squadDirtinessChanged');
        return _this.ship.builder.backend_status.fadeOut('slow');
      });
      this.selector.data('select2').results.on('mousemove-filtered', function(e) {
        var select2_data;
        select2_data = $(e.target).closest('.select2-result-selectable').data('select2-data');
        if ((select2_data != null ? select2_data.id : void 0) != null) {
          return _this.ship.builder.showTooltip('Addon', _this.dataById[select2_data.id]);
        }
      });
      return this.selector.data('select2').container.on('mouseover', function(e) {
        if (_this.data != null) {
          return _this.ship.builder.showTooltip('Addon', _this.data);
        }
      });
    };

    GenericAddon.prototype.setById = function(id) {
      return this.setData(this.dataById[parseInt(id)]);
    };

    GenericAddon.prototype.setByName = function(name) {
      return this.setData(this.dataByName[$.trim(name)]);
    };

    GenericAddon.prototype.setData = function(new_data) {
      var ___iced_passed_deferral, __iced_deferrals, __iced_k,
        _this = this;
      __iced_k = __iced_k_noop;
      ___iced_passed_deferral = iced.findDeferral(arguments);
      if (new_data !== this.data) {
        (function(__iced_k) {
          var _ref;
          if (((_ref = _this.data) != null ? _ref.unique : void 0) != null) {
            (function(__iced_k) {
              __iced_deferrals = new iced.Deferrals(__iced_k, {
                parent: ___iced_passed_deferral,
                funcname: "GenericAddon.setData"
              });
              _this.ship.builder.container.trigger('xwing:releaseUnique', [
                _this.data, _this.type, __iced_deferrals.defer({
                  lineno: 1094
                })
              ]);
              __iced_deferrals._fulfill();
            })(__iced_k);
          } else {
            return __iced_k();
          }
        })(function() {
          (function(__iced_k) {
            if ((new_data != null ? new_data.unique : void 0) != null) {
              (function(__iced_k) {
                __iced_deferrals = new iced.Deferrals(__iced_k, {
                  parent: ___iced_passed_deferral,
                  funcname: "GenericAddon.setData"
                });
                _this.ship.builder.container.trigger('xwing:claimUnique', [
                  new_data, _this.type, __iced_deferrals.defer({
                    lineno: 1096
                  })
                ]);
                __iced_deferrals._fulfill();
              })(__iced_k);
            } else {
              return __iced_k();
            }
          })(function() {
            _this.data = new_data;
            return __iced_k(_this.ship.builder.container.trigger('xwing:pointsUpdated'));
          });
        });
      } else {
        return __iced_k();
      }
    };

    GenericAddon.prototype.getPoints = function() {
      var _ref, _ref1;
      return (_ref = (_ref1 = this.data) != null ? _ref1.points : void 0) != null ? _ref : 0;
    };

    GenericAddon.prototype.updateSelection = function() {
      if (this.data != null) {
        return this.selector.select2('data', {
          id: this.data.id,
          text: "" + this.data.name + " (" + this.data.points + ")"
        });
      } else {
        return this.selector.select2('data', null);
      }
    };

    GenericAddon.prototype.toString = function() {
      if (this.data != null) {
        return "" + this.data.name + " (" + this.data.points + ")";
      } else {
        return "No " + this.type;
      }
    };

    GenericAddon.prototype.toHTML = function() {
      if (this.data != null) {
        return $.trim("<div class=\"upgrade-container\">\n    <div class=\"upgrade-name\">" + this.data.name + "</div>\n    <div class=\"mask movable\">\n        <div class=\"outer-circle\">\n            <div class=\"inner-circle upgrade-points\">" + this.data.points + "</div>\n        </div>\n    </div>\n</div>");
      } else {
        return '';
      }
    };

    return GenericAddon;

  })();

  Upgrade = (function(_super) {
    __extends(Upgrade, _super);

    function Upgrade(args) {
      Upgrade.__super__.constructor.call(this, args);
      this.slot = args.slot;
      this.type = 'Upgrade';
      this.dataById = exportObj.upgradesById;
      this.dataByName = exportObj.upgrades;
      this.setupSelector();
    }

    Upgrade.prototype.setupSelector = function() {
      var _this = this;
      return Upgrade.__super__.setupSelector.call(this, {
        width: '50%',
        placeholder: "No " + this.slot + " Upgrade",
        allowClear: true,
        query: function(query) {
          return query.callback({
            more: false,
            results: _this.ship.builder.getAvailableUpgradesIncluding(_this.slot, _this.data, query.term)
          });
        }
      });
    };

    return Upgrade;

  })(GenericAddon);

  Modification = (function(_super) {
    __extends(Modification, _super);

    function Modification(args) {
      Modification.__super__.constructor.call(this, args);
      this.type = 'Modification';
      this.dataById = exportObj.modificationsById;
      this.dataByName = exportObj.modifications;
      this.setupSelector();
    }

    Modification.prototype.setupSelector = function() {
      var _this = this;
      return Modification.__super__.setupSelector.call(this, {
        width: '50%',
        placeholder: "No Modification",
        allowClear: true,
        query: function(query) {
          return query.callback({
            more: false,
            results: _this.ship.builder.getAvailableModificationsIncluding(_this.data, _this.ship.data, query.term)
          });
        }
      });
    };

    return Modification;

  })(GenericAddon);

  Title = (function(_super) {
    __extends(Title, _super);

    function Title(args) {
      Title.__super__.constructor.call(this, args);
      this.type = 'Title';
      this.dataById = exportObj.titlesById;
      this.dataByName = exportObj.titles;
      this.conferredUpgrades = [];
      this.setupSelector();
    }

    Title.prototype.setData = function(new_data) {
      var idx, slot, upgrade, ___iced_passed_deferral, __iced_deferrals, __iced_k,
        _this = this;
      __iced_k = __iced_k_noop;
      ___iced_passed_deferral = iced.findDeferral(arguments);
      if (new_data !== this.data) {
        (function(__iced_k) {
          if (_this.data != null) {
            (function(__iced_k) {
              __iced_deferrals = new iced.Deferrals(__iced_k, {
                parent: ___iced_passed_deferral,
                funcname: "Title.setData"
              });
              _this.ship.builder.container.trigger('xwing:releaseUnique', [
                _this.data, 'Title', __iced_deferrals.defer({
                  lineno: 1186
                })
              ]);
              __iced_deferrals._fulfill();
            })(function() {
              (function(__iced_k) {
                var _i, _len, _ref;
                __iced_deferrals = new iced.Deferrals(__iced_k, {
                  parent: ___iced_passed_deferral,
                  funcname: "Title.setData"
                });
                _ref = _this.conferredUpgrades;
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                  upgrade = _ref[_i];
                  upgrade.destroy(__iced_deferrals.defer({
                    lineno: 1190
                  }));
                }
                __iced_deferrals._fulfill();
              })(function() {
                var _i, _len, _ref;
                _ref = _this.conferredUpgrades;
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                  upgrade = _ref[_i];
                  idx = _this.ship.upgrades.indexOf(upgrade);
                  _this.ship.upgrades.splice(idx, 1);
                }
                return __iced_k(_this.conferredUpgrades = []);
              });
            });
          } else {
            return __iced_k();
          }
        })(function() {
          (function(__iced_k) {
            if (new_data != null) {
              (function(__iced_k) {
                __iced_deferrals = new iced.Deferrals(__iced_k, {
                  parent: ___iced_passed_deferral,
                  funcname: "Title.setData"
                });
                _this.ship.builder.container.trigger('xwing:claimUnique', [
                  new_data, 'Title', __iced_deferrals.defer({
                    lineno: 1195
                  })
                ]);
                __iced_deferrals._fulfill();
              })(__iced_k);
            } else {
              return __iced_k();
            }
          })(function() {
            var _i, _len, _ref, _ref1;
            _this.data = new_data;
            _this.ship.builder.container.trigger('xwing:pointsUpdated');
            if ((((_ref = _this.data) != null ? _ref.slots : void 0) != null) && _this.data.slots.length > 0) {
              _ref1 = _this.data.slots;
              for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
                slot = _ref1[_i];
                upgrade = new Upgrade({
                  ship: _this.ship,
                  container: _this.container,
                  slot: slot
                });
                _this.ship.upgrades.push(upgrade);
                _this.conferredUpgrades.push(upgrade);
              }
            }
            return __iced_k();
          });
        });
      } else {
        return __iced_k();
      }
    };

    Title.prototype.setupSelector = function() {
      var _this = this;
      return Title.__super__.setupSelector.call(this, {
        width: '50%',
        placeholder: "No Title",
        allowClear: true,
        query: function(query) {
          return query.callback({
            more: false,
            results: _this.ship.builder.getAvailableTitlesIncluding(_this.ship.data.name, _this.data, query.term)
          });
        }
      });
    };

    return Title;

  })(GenericAddon);

}).call(this);
