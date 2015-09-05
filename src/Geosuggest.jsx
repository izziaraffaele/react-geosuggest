/* global google */

var React = require('react'),
  GeosuggestItem = require('./GeosuggestItem'); // eslint-disable-line

var noop = function() {};

var Geosuggest = React.createClass({
  propTypes: {
    className: React.PropTypes.string,
    country: React.PropTypes.string,
    fixtures: React.PropTypes.array,
    googleMaps: React.PropTypes.object,
    initialValue: React.PropTypes.string,
    onBlur: React.PropTypes.func,
    onFocus: React.PropTypes.func,
    onSuggestSelect: React.PropTypes.func,
    placeholder: React.PropTypes.string,
    radius: React.PropTypes.number,
    types: React.PropTypes.array,
  }
  getInitialState: function() {
    return {
      isSuggestsHidden: true,
      userInput: null,
      activeSuggest: null,
      suggests: [],
    };
  },

  /**
   * When the input got changed
   */
  onInputChange: function() {
    var userInput = this.refs.geosuggestInput.getDOMNode().value;

    this.setState({userInput: userInput}, function() {
      this.showSuggests();
    }.bind(this));
  },

  /**
   * Update the value of the user input
   * @param {String} value the new value of the user input
   */
  update: function (value) {
    this.setState({userInput: value});
  },

  /*
   * Clear the input and close the suggestion pane
   */
  clear: function () {
    this.setState({userInput: ''}, function() {
      this.hideSuggests();
    }.bind(this));
  },

  /**
   * Search for new suggests
   */
  searchSuggests: function() {
    if (!this.state.userInput) {
      this.updateSuggests();
      return;
    }

    var options = {
      input: this.state.userInput,
      location: this.props.location || new this.props.googleMaps.LatLng(0, 0),
      radius: this.props.radius
    };

    if (this.props.bounds) {
      options.bounds = this.props.bounds;
    }

    if (this.props.types) {
      options.types = this.props.types;
    }

    if (this.props.country) {
      options.componentRestrictions = {
        country: this.props.country
      };
    }

    this.state.autocompleteService.getPlacePredictions(
      options,
      function(suggestsGoogle) {
        this.updateSuggests(suggestsGoogle);
      }.bind(this)
    );
  },

  /**
   * Update the suggests
   * @param  {Object} suggestsGoogle The new google suggests
   */
  updateSuggests: function(suggestsGoogle) {
    if (!suggestsGoogle) {
      suggestsGoogle = [];
    }

    var suggests = [],
      regex = new RegExp(this.state.userInput, 'gim');

    this.props.fixtures.forEach(function(suggest) {
      if (suggest.label.match(regex)) {
        suggest.placeId = suggest.label;
        suggests.push(suggest);
      }
    });

    suggestsGoogle.forEach(function(suggest) {
      suggests.push({
        label: suggest.description,
        placeId: suggest.place_id
      });
    });

    this.setState({suggests: suggests});
  },

  /**
   * When the input gets focused
   */
  showSuggests: function() {
    this.props.onFocus();
    this.searchSuggests();

    this.setState({isSuggestsHidden: false});
  },

  /**
   * When the input loses focused
   */
  hideSuggests: function() {
    this.props.onBlur();
    setTimeout(function() {
      this.setState({isSuggestsHidden: true});
    }.bind(this), 100);
  },

  /**
   * When a key gets pressed in the input
   * @param  {Event} event The keypress event
   */
  onInputKeyDown: function(event) {
    switch (event.which) {
      case 40: // DOWN
        event.preventDefault();
        this.activateSuggest('next');
        break;
      case 38: // UP
        event.preventDefault();
        this.activateSuggest('prev');
        break;
      case 13: // ENTER
        this.selectSuggest(this.state.activeSuggest);
        break;
      case 9: // TAB
        this.selectSuggest(this.state.activeSuggest);
        break;
      case 27: // ESC
        this.hideSuggests();
        break;
      default:
        break;
    }
  },

  /**
   * Activate a new suggest
   * @param {String} direction The direction in which to activate new suggest
   */
  activateSuggest: function(direction) {
    if (this.state.isSuggestsHidden) {
      this.showSuggests();
      return;
    }

    var suggestsCount = this.state.suggests.length - 1,
      next = direction === 'next',
      newActiveSuggest = null,
      newIndex = 0,
      i = 0;

    for (i; i <= suggestsCount; i++) {
      if (this.state.suggests[i] === this.state.activeSuggest) {
        newIndex = next ? i + 1 : i - 1;
      }
    }

    if (!this.state.activeSuggest) {
      newIndex = next ? 0 : suggestsCount;
    }

    if (newIndex >= 0 && newIndex <= suggestsCount) {
      newActiveSuggest = this.state.suggests[newIndex];
    }

    this.setState({activeSuggest: newActiveSuggest});
  },

  /**
   * When an item got selected
   * @param {GeosuggestItem} suggest The selected suggest item
   */
  selectSuggest: function(suggest) {
    if (!suggest) {
      suggest = {
        label: this.state.userInput
      };
    }

    this.setState({
      isSuggestsHidden: true,
      userInput: suggest.label
    });

    if (suggest.location) {
      this.props.onSuggestSelect(suggest);
      return;
    }

    this.geocodeSuggest(suggest);
  },

  /**
   * Geocode a suggest
   * @param  {Object} suggest The suggest
   */
  geocodeSuggest: function(suggest) {
    this.state.geocoder.geocode(
      {address: suggest.label},
      function(results, status) {
        if (status !== this.props.googleMaps.GeocoderStatus.OK) {
          return;
        }

        var gmaps = results[0],
          location = gmaps.geometry.location;

        suggest.gmaps = gmaps;
        suggest.location = {
          lat: location.lat(),
          lng: location.lng()
        };

        this.props.onSuggestSelect(suggest);
      }.bind(this)
    );
  },

  /**
   * Render the view
   * @return {Function} The React element to render
   */
  render: function() {
    return (// eslint-disable-line no-extra-parens
      <div className={'geosuggest ' + this.props.className}
          onClick={this.onClick}>
        <input
          className="geosuggest__input"
          ref="geosuggestInput"
          type="text"
          value={this.state.userInput}
          placeholder={this.props.placeholder}
          onKeyDown={this.onInputKeyDown}
          onChange={this.onInputChange}
          onFocus={this.showSuggests}
          onBlur={this.hideSuggests} />
        <ul className={this.getSuggestsClasses()}>
          {this.getSuggestItems()}
        </ul>
      </div>
    );
  },

  /**
   * Get the suggest items for the list
   * @return {Array} The suggestions
   */
  getSuggestItems: function() {
    return this.state.suggests.map(function(suggest) {
      var isActive = this.state.activeSuggest &&
        suggest.placeId === this.state.activeSuggest.placeId;

      return (// eslint-disable-line no-extra-parens
        <GeosuggestItem
          key={suggest.placeId}
          suggest={suggest}
          isActive={isActive}
          onSuggestSelect={this.selectSuggest} />
      );
    }.bind(this));
  },

  /**
   * The classes for the suggests list
   * @return {String} The classes
   */
  getSuggestsClasses: function() {
    var classes = 'geosuggest__suggests';

    classes += this.state.isSuggestsHidden ?
      ' geosuggest__suggests--hidden' : '';

    return classes;
  }
});

module.exports = Geosuggest;
