/**
 * @package so
 * @object  so.animation
 * @depends so, so.util, so.dom
 * @author  Kerem Güneş <k-gun@mail.com>
 * @license The MIT License <https://opensource.org/licenses/MIT>
 */
;(function(window, $, NULL, TRUE, FALSE) { 'use strict';

    var re_digit = /^[\d.]+/;
    var re_scroll = /scroll(?:Top|Left)/;
    var re_nonUnitStyles = /(?:(?:fill-?)?opacity|z(?:oom|index)|(?:font-?w|line-?h)eight|column(?:-?count|s))/i;
    var opt_fps = 1000 / 60;
    var opt_speeds = {fast: 50, slow: 650, normal: 150, default: 325};
    // thanks: http://easings.net/ (easeOutQuad)
    var fn_easing = function(t,b,c,d) { return -c*(t/=d)*(t-2)+b; };
    var fn_runner = window.requestAnimationFrame || function(fn) { setTimeout(fn, opt_fps); };
    var $toStyleName = $.util.toStyleName;
    var $easing = ($.ext && $.ext.easing) || {};
    var $extend = $.extend, $for = $.for, $forEach = $.forEach, $float = $.float, $now = $.now,
        $isNumber = $.isNumber, $isString = $.isString, $isFunction = $.isFunction;

    /**
     * Animation.
     * @param {Element}  target
     * @param {Object}   properties
     * @param {Int}      speed?
     * @param {String}   easing?
     * @param {Function} callback?
     */
    function Animation(target, properties, speed, easing, callback) {
        this.$target = $.dom(target);
        this.properties = properties;
        this.speed = $isNumber(speed) ? speed : opt_speeds[speed] || opt_speeds.default;

        // swap arguments
        if ($isFunction(easing)) {
            callback = easing, easing = NULL;
        }

        this.easing = $easing[easing] || fn_easing;
        this.callback = callback;

        this.running = FALSE;
        this.stopped = FALSE;
        this.ended = FALSE;
        this.startTime = 0;
        this.elapsedTime = 0;

        this.tasks = [];

        if (this.$target.size()) {
            // for stop tool
            this.$target.setProperty('$animation', this);

            // assign animation tasks
            $forEach(properties, function(name, value) {
                var scroll, startValue, endValue, diff, style, unit = '';

                name = $toStyleName(name);
                scroll = re_scroll.test(name);

                if (!scroll) {
                    style = $isString(value)
                        ? this.$target.getCssStyle(name) // get original style to catch unit sign
                        : this.$target.getComputedStyle(name);

                    startValue = $float(style);
                    endValue = $float(value);

                    if (!re_nonUnitStyles.test(name)) {
                        unit = style.replace(re_digit, '');
                    }
                } else {
                    startValue = this.$target.scroll()[name.slice(6).lower()];
                    endValue = value;
                }

                diff = Math.abs(endValue - startValue);

                // no need to get excited
                if (!diff) return;

                this.tasks.push({
                    name: name,
                    scroll: scroll,
                    startValue: startValue,
                    endValue: endValue,
                    reverse: startValue > endValue,
                    diff: diff,
                    unit: unit
                });
            }, this);
        }
    }

    $extend(Animation.prototype, {
        /**
         * Run.
         * @return {self}
         */
        run: function() {
            var _this = this;

            _this.stop(); // stop if running
            _this.running = TRUE;
            _this.startTime = $now();

            !function run() {
                if (!_this.$target.size()) {
                    return (_this.running = FALSE, _this.stopped = TRUE = _this.ended = TRUE),
                        $.logWarn('No element(s) to animate.');
                }

                if (!_this.stopped && !_this.ended) {
                    if (_this.elapsedTime < _this.speed) {
                        fn_runner(run);
                        _this.start();
                    } else {
                        _this.end();
                        _this.stop();
                    }
                }
            }();

            return _this;
        },

        /**
         * Start.
         * @return {self}
         */
        start: function() {
            var _this = this, target = _this.$target, scroll, value;

            _this.elapsedTime = $now() - _this.startTime;

            $for(_this.tasks, function(task) {
                value = fn_easing(_this.elapsedTime, 0.00, task.diff, _this.speed);
                value = task.reverse ? task.startValue - value : task.startValue + value;
                if (!task.scroll) {
                    target.setStyle(task.name, value.toFixed(9) /* use 'toFixed' for a good percent */
                        + task.unit);
                } else {
                    target.setProperty(task.name, value.toFixed(0));
                }
            });

            return _this;
        },

        /**
         * End.
         * @return {self}
         */
        end: function() {
            var _this = this, target = _this.$target;

            $for(_this.tasks, function(task) {
                if (!task.scroll) {
                    target.setStyle(task.name, task.endValue + task.unit);
                } else {
                    target.setProperty(task.name, task.endValue);
                }
            });

            _this.ended = TRUE;

            if ($isFunction(_this.callback)) {
                _this.callback(_this);
            }

            return _this;
        },

        /**
         * Stop.
         * @return {self}
         */
        stop: function() {
            var _this = this, target = _this.$target;

            if (_this.running) {
                _this.running = FALSE;
                _this.stopped = TRUE;
            }

            // set as null (for isAnimated() etc.)
            target.setProperty('$animation', NULL);

            return _this;
        }
    });

    // shortcut
    function initAnimation(target, properties, speed, easing, callback) {
        return new Animation(target, properties, speed, easing, callback);
    }

    // add animation to so
    $.animation = {
        Animation: initAnimation,
        animate: function(target, properties, speed, easing, callback) {
            return initAnimation(target, properties, speed, easing, callback).run();
        }
    };

})(window, window.so, null, true, false);
