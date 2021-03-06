define([
    'text!static/feti/js/scripts/templates/searchbar.html',
    'common',
    '/static/feti/js/scripts/collections/search.js',
    '/static/feti/js/scripts/views/sharebar.js'
], function (searchbarTemplate, Common, searchCollection, SharebarView) {
    var SearchBarView = Backbone.View.extend({
        tagName: 'div',
        container: '#map-search',
        template: _.template(searchbarTemplate),
        events: {
            'click #where-to-study': 'categoryClicked',
            'click #what-to-study': 'categoryClicked',
            'click #choose-occupation': 'categoryClicked',
            'click #back-home': 'backHomeClicked',
            'click #result-toogle': 'toogleResult',
            'click #draw-polygon': 'drawModeSelected',
            'click #draw-circle': 'drawModeSelected',
            'click #cancel-draw-polygon': 'cancelDrawClicked',
            'click #cancel-draw-circle': 'cancelDrawClicked',
            'click #clear-draw': 'clearAllDraw'
        },
        initialize: function (options) {
            this.render();
            $("#result-toogle").hide();
            this.$search_bar = $(".search-bar");
            this.$search_bar_input = $("#search-bar-input");
            this.$provider_button = $("#where-to-study");
            this.$course_button = $("#what-to-study");
            this.$occupation_button = $("#choose-occupation");
            this.$result_loading = $("#result-loading");
            this.$result_empty = $("#result-empty");
            this.search_bar_hidden = true;
            this.parent = options.parent;
            this.initAutocomplete();
            this.shareBarView = new SharebarView({parent: this});
            Common.Dispatcher.on('search:finish', this.searchingFinish, this);

            this._drawer = {
                polygon: this._initializeDrawPolygon,
                circle: this._initializeDrawCircle
            }
        },
        render: function () {
            this.$el.empty();
            this.$el.html(this.template());
            $(this.container).append(this.$el);
            // form submit
            var that = this;
            $("#search-form").submit(function (e) {
                that.searchRouting();
                e.preventDefault(); // avoid to execute the actual submit of the form.
            });
        },
        initAutocomplete: function () {
            var that = this;
            this.$search_bar_input.autocomplete({
                source: function (request, response) {
                    that.$search_bar_input.css("cursor", "wait");
                    var url = "/api/autocomplete/" + that.categorySelected();
                    $.ajax({
                        url: url,
                        data: {
                            q: request.term
                        },
                        success: function (data) {
                            that.$search_bar_input.css("cursor", "");
                            response(data);
                        },
                        error: function (request, error) {
                            that.$search_bar_input.css("cursor", "");
                        },
                    });
                },
                minLength: 3,
                select: function (event, ui) {
                    $(this).val(ui.item.value);
                    $("#search-form").submit()
                },
                open: function () {
                    //$(this).removeClass("ui-corner-all").addClass("ui-corner-top");
                },
                close: function () {
                    //$(this).removeClass("ui-corner-top").addClass("ui-corner-all");
                }
            });
            var width = this.$search_bar_input.css('width');
            $('.ui-autocomplete').css('width', width);
        },
        categoryClicked: function (event) {
            this.changeCategoryButton($(event.target).data("mode"));
            this.searchRouting();
            this.trigger('categoryClicked', event);
        },
        backHomeClicked: function (e) {
            this.toggleProvider(e);
            this.trigger('backHome', e);
        },
        searchRouting: function () {
            // update route based on query and filter
            var that = this;
            var new_url = ['map'];
            var mode = that.categorySelected();
            var query = that.$search_bar_input.val();
            new_url.push(mode);
            if (query) {
                new_url.push(query);
                // Get coordinates query from map
                var coordinates = this.parent.getCoordinatesQuery();

                if (coordinates) {
                    new_url.push(coordinates);
                }
            }
            Backbone.history.navigate(new_url.join("/"), true);
        },
        search: function (mode, query, filter) {
            this.$search_bar_input.val(query);
            if (!filter) {
                this.clearAllDraw();
            } else {
                var filters = filter.split('&');

                if (filters[0].split('=').pop() == 'polygon') { // if polygon
                    var coordinates_json = JSON.parse(filters[1].split('=').pop());
                    var coordinates = [];
                    _.each(coordinates_json, function (coordinate) {
                        coordinates.push([coordinate.lat, coordinate.lng]);
                    });
                    this.parent.createPolygon(coordinates);
                } else if (filters[0].split('=').pop() == 'circle') { // if circle
                    var coords = JSON.parse(filters[1].split('=').pop());
                    var radius = filters[2].split('=').pop();
                    this.parent.createCircle(coords, radius);
                }

                $('#clear-draw').show();
            }

            // search
            searchCollection.search(mode, query, filter);
            this.in_show_result = true;
            this.$result_loading.show();
            this.$result_empty.hide();
            this.showResult();
        },
        searchingFinish: function (is_not_empty) {
            this.$result_loading.hide();
            this.shareBarView.show();

            if (!is_not_empty) { // empty
                this.shareBarView.hide();
                this.$result_empty.show();
            }
        },
        showResult: function () {
            var that = this;
            if (this.map_in_fullscreen) {
                var $toogle = $('#result-toogle');
                if ($toogle.hasClass('fa-caret-left')) {
                    $toogle.removeClass('fa-caret-left');
                    $toogle.addClass('fa-caret-right');
                    if (!$('#result').is(":visible")) {
                        $('#result').show("slide", {direction: "right"}, 500, function () {
                            that.in_show_result = false;
                        });
                    }
                }
            }
        },
        toogleResult: function (event) {
            if ($(event.target).hasClass('fa-caret-left')) {
                $(event.target).removeClass('fa-caret-left');
                $(event.target).addClass('fa-caret-right');
                if (!$('#result').is(":visible")) {
                    $('#result').show("slide", {direction: "right"}, 500);
                }
            } else {
                $(event.target).removeClass('fa-caret-right');
                $(event.target).addClass('fa-caret-left');
                if ($('#result').is(":visible")) {
                    $('#result').hide("slide", {direction: "right"}, 500);
                }
            }
        },
        drawModeSelected: function (event) {
            this.$el.find('.search-bar').find('.m-button').removeClass('active');
            $(event.target).addClass('active');
            var selected = $(event.target).get(0).id;

            var drawer = this._drawer[selected.split('-').pop()];
            drawer.call(this);
        },
        _initializeDrawPolygon: function () {
            $('#draw-polygon').hide();
            $('#cancel-draw-polygon').show();
            // enable polygon drawer
            this.parent.enablePolygonDrawer();
        },
        _initializeDrawCircle: function () {
            $('#draw-circle').hide();
            $('#cancel-draw-circle').show();
            // enable circle drawer
            this.parent.enableCircleDrawer();
        },
        cancelDrawClicked: function (element) {
            var shape = $(element.target).attr('id').split('-').pop();
            this.cancelDraw(shape);
        },
        cancelDraw: function (shape) {
            if (shape == 'circle') {
                this.parent.disableCircleDrawer();
            } else if (shape == 'polygon') {
                this.parent.disablePolygonDrawer();
            }
            $('#draw-' + shape).show();
            $('#cancel-draw-' + shape).hide();
            this.$el.find('.search-bar').find('.m-button').removeClass('active');
        },
        clearAllDraw: function () {
            $('#clear-draw').hide();
            // remove all drawn layer in map
            this.parent.clearAllDrawnLayer();
            this.searchRouting();
        },
        showClearDrawButton: function () {
            $('#clear-draw').show();
        },
        categorySelected: function () {
            var button = this.$el.find('.search-category').find('.m-button.active');
            if (button[0]) {
                return $(button[0]).attr("data-mode");
            } else {
                return "";
            }
        },
        // Draw Events
        onFinishedCreatedShape: function (shape) {
            this.cancelDraw(shape);
            this.showClearDrawButton();
            this.searchRouting();
        },
        changeCategoryButton: function (mode) {
            this.$el.find('.search-category').find('.m-button').removeClass('active');
            var $button = null;
            var highlight = "Choose what are you looking for";
            if (mode == "provider") {
                $button = this.$provider_button;
                highlight = 'Search for provider';
            } else if (mode == "course") {
                $button = this.$course_button;
                highlight = 'Search for courses';
            } else if (mode == "occupation") {
                $button = this.$occupation_button;
                highlight = 'Search for occuption';
            }

            // change placeholder of input
            this.$search_bar_input.attr("placeholder", highlight);
            if ($button) {
                $button.addClass('active');
                this.showSearchBar(0);
                Common.CurrentSearchMode = mode;
            }
        },
        mapResize: function (is_resizing) {
            this.map_in_fullscreen = is_resizing;
            if (is_resizing) { // To fullscreen
                this.$('#back-home').show();
                this.$('#result-toogle').show();
                if (this.in_show_result) {
                    this.showResult();
                }
            } else { // Exit fullscreen
                this.$('#back-home').hide();
                this.$('#result-toogle').hide();
            }
        },
        showSearchBar: function (speed) {
            if (this.search_bar_hidden) {
                this.$search_bar.slideToggle(speed);
                // zoom control animation
                var $zoom_control = $('.leaflet-control-zoom');
                $zoom_control.animate({
                    marginTop: '+=55px'
                }, speed);
                var $result = $('#result');
                $result.animate({
                    paddingTop: '+=55px'
                }, speed);

                // now it is shown
                this.search_bar_hidden = false;
            }
        },
        hideSearchBar: function (e) {
            if (!this.search_bar_hidden) {
                this.$search_bar.slideToggle(500, function () {
                    Common.Dispatcher.trigger('map:exitFullScreen');
                });
                // zoom control animation
                var $zoom_control = $('.leaflet-control-zoom');
                $zoom_control.animate({
                    marginTop: '-=55px'
                }, 500);

                // now it is shown
                this.search_bar_hidden = true;
            }
        },
        toggleProvider: function () {
            if ($('#result').is(":visible")) {
                $('#result-toogle').removeClass('fa-caret-right');
                $('#result-toogle').addClass('fa-caret-left');
                $('#result').hide("slide", {direction: "right"}, 500, function () {
                    Common.Dispatcher.trigger('map:exitFullScreen');
                });
            } else {
                Common.Dispatcher.trigger('map:exitFullScreen');
            }
        }
    });

    return SearchBarView;
});