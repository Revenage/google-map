import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import Map from './Map'

class App extends Component {
  render() {
    return (
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h2>Welcome to React</h2>
        </div>
        <div>
            <Map
                ref="map"
                apiKey="AIzaSyAf8JaLhqgEtLIrKFOfGDZeLsXCyLw0oUU"
                mapAddress={'New York, Park Avenue'}
                choosenStyle={0}
                zoomControl={true}
                draggableMap={true}
                mapZoom={10}
                onLoad={(p) => console.log(p)}
                zoomChanged={(p) => console.log(p)} // 11
                onDnD={(p) => console.log(p)}
                style={{
                    width: '60%',
					height: 300,
					margin: '100px auto'
				}}
                mapStyle={ // https://snazzymaps.com/style/61/blue-essence
					[
						{
							"featureType": "landscape.natural",
							"elementType": "geometry.fill",
							"stylers": [
								{
									"visibility": "on"
								},
								{
									"color": "#e0efef"
								}
							]
						},
						{
							"featureType": "poi",
							"elementType": "geometry.fill",
							"stylers": [
								{
									"visibility": "on"
								},
								{
									"hue": "#1900ff"
								},
								{
									"color": "#c0e8e8"
								}
							]
						},
						{
							"featureType": "road",
							"elementType": "geometry",
							"stylers": [
								{
									"lightness": 100
								},
								{
									"visibility": "simplified"
								}
							]
						},
						{
							"featureType": "road",
							"elementType": "labels",
							"stylers": [
								{
									"visibility": "off"
								}
							]
						},
						{
							"featureType": "transit.line",
							"elementType": "geometry",
							"stylers": [
								{
									"visibility": "on"
								},
								{
									"lightness": 700
								}
							]
						},
						{
							"featureType": "water",
							"elementType": "all",
							"stylers": [
								{
									"color": "#7dcdcd"
								}
							]
						}
					]
                }
            />
        </div>
      </div>
    );
  }
}

export default App;
