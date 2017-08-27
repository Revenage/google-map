import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './map.css';
import debounce from 'lodash-es/debounce';
import  Promise from 'promise';

const RELAUNCH_TIMEOUT = 300;
const MAP_TYPES = {
	ROADMAP: 'ROADMAP',
	SATELLITE: 'SATELLITE',
	HYBRID: 'HYBRID',
	TERRAIN: 'TERRAIN'
};

function URLtoLatLng(url) {
	if (!~url.indexOf('http')) {
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

function getType(mapType) {
	const google = window.google;
	const type = MAP_TYPES[mapType];
	return google.maps.MapTypeId[type];
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
			mapType,
			addressBubble,
			draggableMap,
			zoomControl
		} = nextProps;



		const { props } = this;
		const { map, marker } = this.state;
		const { setOptions, setPosition, setMapTypeId } = map;
		const { setMap } = marker;
		if (mapStyle !== props.mapStyle) {
			setOptions({ styles: mapStyle });
		}
		if (mapZoom !== props.mapZoom) {
			setOptions({ zoom: mapZoom });
		}
		if (position !== props.position) {
			setPosition(position, true);
		}
		if (mapType !== props.mapType) {
			setMapTypeId(getType(mapType));
		}
		if (addressBubble !== props.addressBubble) {
			if (!addressBubble) {
				this.setPosition(position, true);
			} else {
				setMap(null);
			}
		}
		if (draggableMap !== props.draggableMap) {
			setOptions({ draggable: draggableMap });
		}

		if (zoomControl !== props.zoomControl) {
			setOptions({ zoomControl });
		}
	}

	setPosition(position = this.props.position, centration) {
		const { state, props } = this;
		const { addressBubble } = props;
		const { map } = state;

		this
			.getPosition(position)
			.then(location => {
				if (centration) {
					map.setCenter(location);
				}
				if (!addressBubble) {
					this.drawMarker(
						location.lat(),
						location.lng()
					);
				}
			})
			.catch(err => this.onError('Google geocoder error ', err));
	}

	getPosition(address='') {
		const google = window.google;
		const geocoder = new google.maps.Geocoder();
		return new Promise((resolve, reject) => {
			if (address.includes('/@')) {
				const location = new google.maps.LatLng(...URLtoLatLng(address))
				resolve(location)
			} else {
				if (geocoder) {
					geocoder.geocode({ address }, (results, status) => {
						const { GeocoderStatus } = google.maps;
						const { OK, ZERO_RESULTS } = GeocoderStatus;
						if (status === OK && status !== ZERO_RESULTS) {
								const { location } = results[0].geometry;
								resolve(location)
						} else {
							reject(this.onError(status));
						}
					});
				} else {
					reject(this.onError('Google geocoder not loaded'));
				}
			}
		});
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
			mapTypeId: mapType,
			position,
			markerPosition,
			markerIcon,
			mapCenter,
			fullscreenControl,
			mapStyle: styles
		} = props;

		const mapPref = {
			zoom,
			styles,
			draggable,
			mapTypeId: getType(mapType), //todo fix it
			minZoom: 4,
			maxZoom: 21,
			zoomControl,
			addressBubble,
			fullscreenControl,
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

		if (markerPosition) {
			this
			.getPosition(markerPosition)
			.then(location => Marker.setPosition(location))

		}

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
		let { props } = this;
		let { map, marker } = this.state;
		const { markerIcon } = props;
		const google = window.google;
		let latlng = new google.maps.LatLng(lat, lng);

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
		const { props } = this;
		const { style, children } = props;

		return (
			<div className='google-map'>
				<div
					className="mapholder"
					ref={ref => this.mapholder = ref}
					style={style}
				/>
			{ children &&
					<div className='content' ref={ref => this.content = ref}>
						{children}
					</div>
				}
			</div>
		);
	}
}

Map.defaultProps = {
	position: '', // Google map url or location
	markerPosition: null,
	apiKey: '',
	markerIcon: 'https://1.bp.blogspot.com/_GZzKwf6g1o8/S6xwK6CSghI/AAAAAAAAA98/_iA3r4Ehclk/s1600/marker-green.png',
	mapZoom: 15,
	mapType: MAP_TYPES.ROADMAP,
	addressBubble: false,
	draggableMap: false,
	zoomControl: false,
	fullscreenControl: true,
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
	fullscreenControl: PropTypes.bool,
	position: PropTypes.string,
	markerPosition: PropTypes.string,
	styles: PropTypes.object,
	onLoad: PropTypes.func,
	zoomChanged: PropTypes.func,
	onDnD: PropTypes.func,
	mapStyle: PropTypes.array,
};

export default Map;
