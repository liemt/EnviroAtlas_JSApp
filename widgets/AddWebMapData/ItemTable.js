/*
Copyright ©2014 Esri. All rights reserved.

TRADE SECRETS: ESRI PROPRIETARY AND CONFIDENTIAL
Unpublished material - all rights reserved under the
Copyright Laws of the United States and applicable international
laws, treaties, and conventions.

For additional information, contact:
Attn: Contracts and Legal Department
Environmental Systems Research Institute, Inc.
380 New York Street
Redlands, California, 92373
USA

email: contracts@esri.com
*/

/*
 * derived from jimu.js\dijit\_ItemTable.js
 */

/*global console, define, dojo */

define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dojo/text!./ItemTable.html',
    'dojo/Evented',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/_base/html',
    'dojo/_base/Deferred',
    'dojo/query',
    'dojo/NodeList-traverse',
    'dojo/on',
    'jimu/utils',
    'jimu/portalUtils',
    'jimu/portalUrlUtils',
    'jimu/dijit/LoadingIndicator',
    'dijit/Dialog'
], function (declare,
    _WidgetBase,
    _TemplatedMixin,
    _WidgetsInTemplateMixin,
    template,
    Evented,
    lang,
    array,
    html,
    Deferred,
    query,
    NodeList,
    on,
    jimuUtils,
    portalUtils,
    portalUrlUtils,
    LoadingIndicator,
    Dialog) {
    /*jshint unused: false*/
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
        templateString: template,
        baseClass: "jimu-item-table",
        query: null,
        filteredQuery: null,
        portalUrl: null,
        hidden: false,
        nls: null,
        types: '', //required,array, filter search results,such as ["Feature Service","Map Service"]
        typeKeywords: '', //optional, array, filter search results,such as ["Web AppBuilder","Web Map"]

        //public methods:
        //getSelectedItem
        //show
        //hide
        //searchAllItems
        //searchFilteredItems
        //clear
        //clearAllItemsSection
        //clearFilteredItemsSection
        //showAllItemsSection
        //showFilterItemsSection

        //css classes:
        //item
        //item-border
        //item-thumbnail
        //item-info
        //item-name
        //item-type-owner
        //item-date
        //item-details
        //search-none-icon
        //search-none-tip

        _defaultThumbnail: {
            "Web Mapping Application": "webapp.png",
            "Mobile Application": "mobileapp.png"
        },

        postMixInProperties: function () {
            this.nls = window.jimuNls.itemSelector;
        },

        postCreate: function () {
            this.inherited(arguments);

            if (!(this.types && this.types.length > 0)) {
                this.types = [];
            }

            this.hidden = this.hidden === true;
            if (this.hidden) {
                this.hide();
            }
            if (this.portalUrl) {
                this.portalUrl = portalUrlUtils.getStandardPortalUrl(this.portalUrl);
            }

            this.showAllItemsSection();
            this.searchAllItems();
            
        },

        show: function () {
            html.setStyle(this.domNode, 'display', 'block');
        },

        hide: function () {
            html.setStyle(this.domNode, 'display', 'none');
        },

        searchAllItems: function (newQuery) {
            this.showAllItemsSection();
            if (newQuery) {
                this.query = lang.mixin({}, newQuery);
                this.query.start = 1;
                this.clearAllItemsSection();
            }
            if (!this.portalUrl || !this.query) {
                return;
            }
            if (this.query.start > 0) {
                this.allItemsShelter.show();
                var portal = portalUtils.getPortal(this.portalUrl);
                var def = portal.queryItems(this.query);

                def.then(lang.hitch(this, function (response) {
                    if (!this.domNode) {
                        return;
                    }
                    this.allItemsShelter.hide();
                    this.query.start = response.nextStart;
                    this._createItems(response, this.allItemTbody);
                }), lang.hitch(this, function (err) {
                    console.error(err);
                    if (!this.domNode) {
                        return;
                    }
                    this.allItemsShelter.hide();
                }));
            }
        },

        searchFilteredItems: function ( /*optional*/ newFilteredQuery) {
            //if newFilteredQuery is not null or undefined, it means the dijit will search a new query
            //otherwise it means this method is called when scroll to bottom of this.filteredItemsTableDiv
            this.showFilterItemsSection();

            if (newFilteredQuery) {
                this.filteredQuery = lang.clone(newFilteredQuery);
                this.filteredQuery.start = 1;
                this.clearFilteredItemsSection();
            }

            if (!this.portalUrl || !this.filteredQuery) {
                return;
            }

            if (this.filteredQuery.start > 0) {
                this.filteredItemShelter.show();
                var portal = portalUtils.getPortal(this.portalUrl);
                var def = portal.queryItems(this.filteredQuery);

                def.then(lang.hitch(this, function (response) {
                    if (!this.domNode) {
                        return;
                    }
                    this.showFilterItemsSection();
                    if (newFilteredQuery) {
                        this.clearFilteredItemsSection();
                    }
                    this.filteredQuery.start = response.nextStart;
                    this._createItems(response, this.filteredItemsTbody);
                    this._filterItemCallback();
                }), lang.hitch(this, function (err) {
                    console.error(err);
                    if (!this.domNode) {
                        return;
                    }
                    this._filterItemCallback();
                }));
            }
        },

        _filterItemCallback: function () {
            this.filteredItemShelter.hide();
            var count = this._getItemCount(this.filteredItemsTbody);
            if (count > 0) {
                html.setStyle(this.filteredItemsTableDiv, 'display', 'block');
                html.setStyle(this.searchNoneTipSection, 'display', 'none');
            } else {
                html.setStyle(this.filteredItemsTableDiv, 'display', 'none');
                html.setStyle(this.searchNoneTipSection, 'display', 'block');
            }
        },

        clear: function () {
            this.clearAllItemsSection();
            this.clearFilteredItemsSection();
        },

        clearAllItemsSection: function () {
            html.empty(this.allItemTbody);
        },

        clearFilteredItemsSection: function () {
            html.empty(this.filteredItemsTbody);
        },

        showAllItemsSection: function () {
            html.setStyle(this.allItemsSection, 'display', 'block');
            html.setStyle(this.filteredItemsSection, 'display', 'none');
        },

        showFilterItemsSection: function () {
            html.setStyle(this.allItemsSection, 'display', 'none');
            html.setStyle(this.filteredItemsSection, 'display', 'block');
            html.setStyle(this.filteredItemsTableDiv, 'display', 'block');
            html.setStyle(this.searchNoneTipSection, 'display', 'none');
        },

        _onAllItemsSectionScroll: function () {
            if (this._isScrollToBottom(this.allItemsTableDiv)) {
                this.searchAllItems();
            }
        },

        _onFilteredItemsSectionScroll: function () {
            if (this._isScrollToBottom(this.filteredItemsTableDiv)) {
                this.searchFilteredItems();
            }
        },

        _isScrollToBottom: function (div) {
            return jimuUtils.isScrollToBottom(div);
        },

        _createItems: function (response, tbody) {
            var results = response.results;
            var typesLowerCase = array.map(this.types, lang.hitch(this, function (type) {
                return type.toLowerCase();
            }));
            var items = array.filter(results, lang.hitch(this, function (item) {
                var type = (item.type && item.type.toLowerCase()) || '';
                return array.indexOf(typesLowerCase, type) >= 0;
            }));
            var countPerRow = 1;
            if (items.length === 0) {
                return;
            }
            var itemsHash = {},
                itemDiv;

            // TODO since not using >1 column, get rid of empty td check
            var emptyTds = query('td.empty', tbody);
            var i;
            if (emptyTds.length > 0) {
                var usedEmptyTdCount = Math.min(items.length, emptyTds.length);
                var ws = items.splice(0, usedEmptyTdCount);
                for (i = 0; i < usedEmptyTdCount; i++) {
                    var emptyTd = emptyTds[i];
                    itemDiv = this._createItem(ws[i]);
                    itemsHash[itemDiv.item.id] = itemDiv;
                    html.place(itemDiv, emptyTd);
                    html.removeClass(emptyTd, 'empty');
                }
            }

            if (items.length === 0) {
                return;
            }

            for (i = 0; i < items.length; i++) {
                var trDom = html.toDom("<tr><td></td></tr>");
                html.place(trDom, tbody);
                var td = query('td', trDom)[0];
                var item = items[i];
                if (item) {
                    itemDiv = this._createItem(item);
                    itemsHash[itemDiv.item.id] = itemDiv;
                    html.place(itemDiv, td);
                }

            }

        },

        _getItemCount: function (tbody) {
            return query('.item', tbody).length;
        },

        _createItem: function (item) {
            var str = '<div class="item">' +
                '<div class="item-thumbnail jimu-auto-vertical">' +
                '<div class="none-thumbnail-tip jimu-auto-vertical-content"></div>' +
                '</div>' +
                '<div class="item-info">' +
                '<div class="item-name"></div>' +
                '<div class="item-snippet"></div>' +
                '<a class="item-details" target="_blank"></a>' +
                '</div>' +
                '</div>';
            var itemDiv = html.toDom(str);
            itemDiv.item = item;
            var itemThumbnail = query('.item-thumbnail', itemDiv)[0];
            var itemName = query('.item-name', itemDiv)[0];
            var itemSnippet = query('.item-snippet', itemDiv)[0];
            var itemDetails = query('.item-details', itemDiv)[0];
            var noneThumbnailTip = query('.none-thumbnail-tip', itemDiv)[0];
            if (!item.thumbnailUrl) {
                var defaultThumbnail = this._defaultThumbnail[item.type];
                if (defaultThumbnail) {
                    item.thumbnailUrl = require.toUrl('jimu') + '/images/' + defaultThumbnail;
                }
            }
            if (item.thumbnailUrl) {
                html.setStyle(itemThumbnail, 'backgroundImage', "url(" + item.thumbnailUrl + ")");
            } else {
                noneThumbnailTip.innerHTML = this.nls.noneThumbnail;
            }
            itemName.innerHTML = item.title;
            itemName.title = itemName.innerHTML;
            itemSnippet.innerHTML = "<div><p>" + item.snippet + "</p></div>";
            itemSnippet.title = item.snippet;
            itemDetails.innerHTML = this.nls.moreDetails;
            //itemDetails.href = item.detailsPageUrl || "#";
            return itemDiv;
        },

        showDetails: function(title,description){
            var mapDescription = new Dialog({
                title: title,
                style: "width: 400px",    
            });
            mapDescription.show();
            mapDescription.set("content", description);
        },
        
        /**
         * when an item is clicked on the widget, fire the item selected event
         * unless it is the item details link
         * @param {Object} event [[Description]]
         */
        _onItemsTableClicked: function (event) {
            var target = event.target || event.srcElement;

            // find the parent item node
            var itemDiv = query(target).parents('.item')[0];

            if (!itemDiv) {
                return;
            }
            
            if (html.hasClass(target, 'item-details')) {
                // do not select if user clicks hyperlink
                //console.log("ItemTable :: _onItemsTableClicked :: item details clicked");
                this.showDetails(itemDiv.item.title,itemDiv.item.description);
                return;
            }

            // remove from previously selected item
            query('.item.jimu-state-active', this.domNode).removeClass('jimu-state-active');

            // add to newly selected item
            html.addClass(itemDiv, 'jimu-state-active');

            // fire item selected event
            this.emit('item-selected', itemDiv.item);
            //console.log("ItemTable :: _onItemsTableClicked :: item selected", itemDiv.item);        
            
        },

        getSelectedItem: function () {
            var item = null;
            var itemDivs = query('.item.jimu-state-active', this.domNode);
            if (itemDivs.length > 0) {
                var itemDiv = itemDivs[0];
                item = lang.mixin({}, itemDiv.item);
            }
            return item;
        }
    });
});