import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './map.css';
import debounce from 'lodash-es/debounce';
import  Promise from 'promise';

const RELAUNCH_TIMEOUT = 300;

function URLtoLatLng(url) {
	if (url.indexOf('http') === -1) {
		return {
			lat: null,
			lng: null
		};
	}
	let latlng = url.substring(url.indexOf('@') + 1).split(',');
	return {
		lat: latlng[0],
		lng: latlng[1]
	};
}

function getSource(apiKey) {
	return `https://maps.googleapis.com/maps/api/js?key=${apiKey}&output=embed&libraries=places&language=en`
}

class Map extends Component {

	state = {
		map: null,
		marker: null,
		lodedAPI: false
	};

	static onError(message) {
		return message;
	}

	constructor(props) {
		super(props);
		this.drawMap = this.drawMap.bind(this);
		this.setPosition = this.setPosition.bind(this);
		this.updateMap = this.updateMap.bind(this);
		this.onLoad = this.onLoad.bind(this);
		this.onError = Map.onError.bind(this);
	}

	componentDidMount() {
		this.callMap();
	}

	componentWillReceiveProps(nextProps) {
		const {
			mapStyle,
			mapZoom,
			position,
			mapTypeId,
			addressBubble,
			draggableMap,
			zoomControl
		} = nextProps;

		const { props } = this;
		const { map, marker } = this.state;
		if (mapStyle !== props.mapStyle) {
			map.setOptions({ styles: mapStyle });
		}
		if (mapZoom !== props.mapZoom) {
			map.setOptions({ zoom: mapZoom });
		}
		if (position !== props.position) {
			Map.setPosition(position, true);
		}
		if (mapTypeId !== props.mapTypeId) {
			const google = window.google;
			map.setMapTypeId(google.maps.MapTypeId[mapTypeId]);
		}
		if (addressBubble !== props.addressBubble) {
			if (!addressBubble) {
				this.setPosition(position, true);
			} else {
				marker.setMap(null);
			}
		}
		if (draggableMap !== props.draggableMap) {
			map.setOptions({ draggable: draggableMap });
		}

		if (zoomControl !== props.zoomControl) {
			map.setOptions({ zoomControl });
		}
	}

	setPosition(position = this.props.position, centration) {
		setTimeout(() => {
			if (~position.indexOf('/@')) {
				this.setPositionFromURL(position, centration);
			} else {
				this.setPositionFromAddress(position, centration);
			}
		})
	}

	setPositionFromURL(url, centration) {
		const { state, props } = this;
		const { addressBubble } = props;
		const { map } = state;
		const { lat, lng } = URLtoLatLng(url);
		const google = window.google;

		if (centration) {
			map.setCenter(new google.maps.LatLng(lat, lng));
		}

		if (!addressBubble) {
			this.drawMarker(lat, lng);
		}
	}

	setPositionFromAddress(val, centration) {
		const { state, props } = this;
		const { addressBubble } = props;
		const { map } = state;
		const google = window.google;
		const geocoder = new google.maps.Geocoder();
		if (geocoder) {
			geocoder.geocode({ address: val }, (results, status) => {
				const { GeocoderStatus } = google.maps;
				const { OK, ZERO_RESULTS } = GeocoderStatus;
				if (status === OK) {
					if (status !== ZERO_RESULTS) {
						const { location } = results[0].geometry;

						if (centration) {
							map.setCenter(location);
						}
						if (!addressBubble) {
							this.drawMarker(
								location.lat(),
								location.lng()
							);
						}
					} else {
						this.onError(status);
					}
				} else {
					this.onError(status);
				}
			});
		} else {
			this.onError('Google geocoder not loaded');
		}
	}

	callMap() {
		const { apiKey } = this.props;
		const googleApi = document.getElementById('googleMapAPI');
		if (googleApi) {
			const { lodedAPI } = this.state;
			if (lodedAPI) {
				this.drawMap();
			} else {
				this.loadMap(googleApi);
			}
		} else {
			let script = document.createElement('script');
			script.src = getSource(apiKey);
			script.id = 'googleMapAPI';
			document.body.appendChild(script);
			this.loadMap(script);
		}
	}

	updateMap() {
		debounce(() => this.drawMap(), RELAUNCH_TIMEOUT);
	}

	loadMap(script) {
		let promise = new Promise((resolve, reject) => {
			script.onload = () => {
				resolve();
				reject();
			};
		});
		promise
			.then(
				() => {
					this.setState({
						lodedAPI: true
					});
					this.drawMap()
				},
				error => this.onError(error)
			);
	}

	drawMap() {
		const google = window.google;
		if (!google) return;
		const mapHolder = this.mapholder;
		const { props } = this;
		const {
			mapZoom: zoom,
			draggableMap: draggable,
			zoomControl,
			addressBubble,
			mapTypeId: typeId,
			position,
			markerIcon,
			mapCenter,
			mapStyle: styles
		} = props;

		const mapTypeId = google.maps.MapTypeId[typeId];
		const mapPref = {
			zoom,
			styles,
			draggable,
			mapTypeId,
			minZoom: 4,
			maxZoom: 21,
			zoomControl,
			addressBubble,
			scrollwheel: false,
			scaleControl: false,
			mapTypeControl: false,
			streetViewControl: false,
			disableDoubleClickZoom: true,
		};

		const Map = new google.maps.Map(mapHolder, mapPref);

		this.setState({
			map: Map
		});

		this.setPosition(position, !mapCenter);

		if (mapCenter) {
			const { lat, lng } = mapCenter;
			Map.setCenter(new google.maps.LatLng(lat, lng));
		}

		const Marker = new google.maps.Marker({
			map: Map,
			icon: markerIcon
		});

		this.setState({
			marker: Marker
		});

		this.onLoad();
	}

	onLoad() {
		const { onLoad, zoomChanged, onDnD } = this.props;
		const {map, marker} = this.state;

		if (zoomChanged) {
			map.addListener('zoom_changed', () => {
				zoomChanged(map.getZoom());
			});
		}

		if (onDnD) {
			map.addListener('dragend', () => {
				onDnD({ ...map.getCenter().toJSON() });
			});
		}

		onLoad({ map, marker });
		return { map, marker }
	}

	drawMarker(lat, lng) {
		const google = window.google;
		let latlng = new google.maps.LatLng(lat, lng);
		let { props } = this;
		let { map, marker } = this.state;
		const { markerIcon } = props;

		if (!marker) {
			marker = new google.maps.Marker({
				map,
				icon: markerIcon
			});
		}

		marker.setMap(map);
		marker.setPosition(latlng);
	}

	render() {
		const { style } = this.props;
		return (
			<div
				className="mapholder"
				ref={ref => this.mapholder = ref}
				style={style}
			/>
		);
	}
}

Map.defaultProps = {
	apiKey: '',
	markerIcon: 'https://1.bp.blogspot.com/_GZzKwf6g1o8/S6xwK6CSghI/AAAAAAAAA98/_iA3r4Ehclk/s1600/marker-green.png',
	mapZoom: 15,
	mapTypeId: 'ROADMAP',
	addressBubble: false,
	draggableMap: false,
	zoomControl: false,
	position: '', // Google map url or location
	style: {
		width: '100%',
		height: '100%'
	},
	mapStyle: [], // https://snazzymaps.com
	onLoad: () => {}, // { map, marker }
	onError: () => {}, // error message
};

Map.propTypes = {
	apiKey: PropTypes.string,
	markerIcon: PropTypes.string,
	mapZoom: PropTypes.number,
	mapTypeId: PropTypes.string,
	addressBubble: PropTypes.bool,
	draggableMap: PropTypes.bool,
	zoomControl: PropTypes.bool,
	position: PropTypes.string,
	styles: PropTypes.object,
	onLoad: PropTypes.func,
	zoomChanged: PropTypes.func,
	onDnD: PropTypes.func,
	mapStyle: PropTypes.array,
};

export default Map;

