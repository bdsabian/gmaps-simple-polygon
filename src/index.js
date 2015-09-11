export class Dot {
	constructor(latLng, map, options={}) {
		this.latLng = latLng;
		this.markerObj = new google.maps.Marker({position: this.latLng, map: map});
		this.events = new Array;

		this.callbackContext = options['callbackContext'] || this;
		this.callbacks = {
			dot_clicked: options['onDotClicked']
		};

		this._addListeners();
	}

	getLatLng() {
		return this.latLng;
	}

	getMarketObj() {
		return this.markerObj;
	}

	remove() {
		this.markerObj.setMap(null);
		this._removeListeners();
	}

	on(event_name, callback) {
		this.callbacks[event_name] = callback;
	}

	_trigger() {
		if(arguments.length==0) {
			return true;
		}

		let args = new Array;
		Array.prototype.push.apply(args, arguments);

		let event_name = args.shift();
		if(this.callbacks[event_name] !== null && this.callbacks[event_name] !== undefined) {
			return this.callbacks[event_name].apply(this.callbackContext, args);
		} else {
			return true;
		}
	}

	_addListeners() {
		this.events.push(google.maps.event.addListener(this.markerObj, 'click',() => {
			this._trigger('dot_clicked', this);
		}));
	}

	_removeListeners() {
		this.events.forEach(event => {
			google.maps.event.removeListener(event);
		});

		this.events = new Array;
	}
}

export class Line {
	constructor(listOfDots, map, color) {
		this.listOfDots = listOfDots;
		this.map = map;
		this.color = color;
		this.coords = new Array;

		if(this.listOfDots.length > 1) {
			this.listOfDots.forEach(dot => {
				this.coords.push(dot.getLatLng());
			});
			this.polylineObj = new google.maps.Polyline({
				path: this.coords,
				strokeColor: this.color,
				strokeOpacity: 1.0,
				strokeWeight: 2,
				map: this.map
			});
		}
	}

	setColor(color) {
		this.color = color;
		this.polylineObj.setOptions({strokeColor: this.color});
	}

	remove() {
		this.polylineObj.setMap(null);
	}
}

export class Pen {
	constructor(map, options={}) {
		this.map = map;
		this.callbackContext = options['callbackContext'] || this;
		this.color = options['color'] || '#000';
		this.listOfDots = new Array;
		this.isDrawing = false;

		this.callbacks = {
			start_draw: 	options['onStartDraw'],
			finish_draw:	options['onFinishDraw'],
			cancel_draw:	options['onCancelDraw'],
			dot_added:		options['onDotAdded']
		};

		this._addListeners();
	}

	draw(latLng) {
		this.isDrawing = true;
		if(this.currentDot !== null && this.currentDot !== undefined && this.listOfDots.length > 1 && this.currentDot.latLng == this.listOfDots[0].latLng) {
			this._trigger('finish_draw', this);
			this.clear();
			this.isDrawing = false;
		} else {
			if(this.polyline !== null && this.polyline !== undefined) {
				this.polyline.remove();
			}

			let dot = new Dot(latLng, this.map, {
				callbackContext: this,
				onDotClicked: this._dotClicked
			});

			this.listOfDots.push(dot);

			if(this.listOfDots.length==1) {
				this._trigger('start_draw', this);
			}

			if(this.listOfDots.length > 1) {
				const _this = this;
				this.polyline = new Line(this.listOfDots, this.map, this.color);
			}
			this._trigger('dot_added', dot);
		}
	}

	getListOfDots() {
		this.listOfDots;
	}

	clear() {
		this.listOfDots.forEach(dot => {
			dot.remove();
		});
		
		this.listOfDots = new Array;

		if(this.polyline !== null && this.polyline !== undefined) {
			this.polyline.remove();
			this.polyline = null;
		}
	}

	remove() {
		this.clear();
		this._removeListeners();

		this.events = new Array;
	}

	on(event_name, callback) {
		this.callbacks[event_name] = callback;
	}

	_trigger() {
		if(arguments.length == 0) {
			return true;
		}

		let args = new Array;
		Array.prototype.push.apply(args, arguments);

		let event_name = args.shift();
		if(this.callbacks[event_name] !== null && this.callbacks[event_name] !== undefined) {
			return this.callbacks[event_name].apply(this.callbackContext, args);
		} else {
			return true;
		}
	}

	_setCurrentDot(dot) {
		this.currentDot = dot;
	}

	_dotClicked(dot) {
		this._setCurrentDot(dot);
		this.draw(dot.getMarketObj().getPosition());
	}

	_addListeners() {
		this.events = new Array;

		this.events.push(google.maps.event.addDomListener(this.map, 'click', event => {
			this.draw(event.latLng);
		}));
		this.events.push(google.maps.event.addDomListener(this.map, 'keyup', event => {
			const code =  event.keyCode ? event.keyCode : event.which;
			switch(code) {
				case 27:
					this._trigger('cancel_draw');
			}
		}));
	}

	_removeListeners() {
		this.events.forEach(event => {
			google.maps.event.removeListener(event);
		});
	}
}

export class Polygon {
	constructor(listOfDots, options={}) {
		this.coords = new Array;
		this.events = new Array;
		this.listOfDots = listOfDots;
		this.map = options['map'];
		this.id = options['id'];
		this.meta = options['meta'] || {}
		this.isDragging = false;
		this.callbackContext = options['callbackContext'] || this;
		this.callbacks = {
			polygon_changed:	options['onPolygonChanged'],
			polygon_clicked:	options['onPolygonClicked'],
			polygon_selected:	options['onPolygonSelected'],
			polygon_deselected:	options['onPolygonDeselected'],
			polygon_removed:	options['onPolygonRemoved']
		};

		let color = options['color'] || '#f00';

		this.listOfDots.forEach(dot => {
			this.addDot(dot);
		});

		this.polygonObj = new google.maps.Polygon({
			draggable: true,
			editable: options['editable'] || false,
			paths: this.coords,
			strokeOpacity: options['strokeOpacity'] || 0.8,
			strokeWeight: options['strokeWeight'] || 2,
			fillOpacity: options['fillOpacity'] || 0.35,
			fillColor: color,
			strokeColor: color,
			map: this.map
		});

		this._addListeners();
	}

	getData() {
		let data = new Array;
		const paths = this.getPlots();

		paths.getAt(0).forEach(path => {
			data.push({lat: path.lat(), lng: path.lng()})
		});
		return data;
	}

	getPolygonObj() {
		return this.polygonObj;
	}

	getListOfDots() {
		return this.listOfDots;
	}

	getPlots() {
		return this.polygonObj.getPaths();
	}

	isEditable() {
		return this.polygonObj.editable;
	}

	setColor(color='#f00') {
		this.polygonObj.setOptions({
			fillColor: color,
			strokeColor: color
		});
	}

	setEditable(editable) {
		this.polygonObj.setOptions({
			editable: editable,
			draggable: editable
		});
	}

	setMap(map) {
		this.map = map;
		this.polygonObj.setMap(this.map);
	}

	setMeta() {
		if(arguments.length==1) {
			this.meta = arguments[0];
		} else if(arguments.length > 1) {
			let key = arguments[0];
			let value = arguments[1];
			this.meta[key] = value;
		}
	}

	getMeta() {
		if(arguments.length==0) {
			return this.meta;
		} else {
			let key = arguments[0];
			return this.meta[key];
		}
	}

	addDot(value) {
		const latLng = (value instanceof Dot) ? value.latLng : this._coordFromJson(value);
		this.coords.push(latLng);
	}

	select() {
		this.setEditable(true);
		this._trigger('polygon_selected', this);
	}

	deselect() {
		this.setEditable(false)
		this._trigger('polygon_deselected', this);
	}

	remove() {
		this.polygonObj.setMap(null);
		this._removeListeners();
		this._trigger('polygon_removed', this);
	}

	on(event_name, callback) {
		this.callbacks[event_name] = callback;
	}

	_trigger() {
		if(arguments.length == 0) {
			return true;
		}

		let args = [];
		Array.prototype.push.apply(args, arguments);

		const event_name = args.shift();
		if(this.callbacks[event_name] !== null && this.callbacks[event_name] !== undefined) {
			return this.callbacks[event_name].apply(this.callbackContext, args);
		} else {
			return true;
		}
	}

	_addListeners() {
		let polygonPath = this.polygonObj.getPath();
		
		this.events.push(google.maps.event.addListener(polygonPath, 'insert_at', event => {
			if(!this.isDragging) {
				this._trigger('polygon_changed', this, 'insert');
			}
		}));
		
		this.events.push(google.maps.event.addListener(polygonPath, 'set_at', event => {
			if(!this.isDragging) {
				this._trigger('polygon_changed', this, 'move');
			}
		}));
		
		this.events.push(google.maps.event.addListener(polygonPath, 'remove_at', event => {
			if(!this.isDragging) {
				this._trigger('polygon_changed', this, 'remove');
			}
		}));

		this.events.push(google.maps.event.addListener(this.polygonObj, 'dragstart', event => {
			this.isDragging = true;
		}));

		this.events.push(google.maps.event.addListener(this.polygonObj, 'dragend', event => {
			this.isDragging = false;
			this._trigger('polygon_changed', this, 'drag');
		}));
		
		this.events.push(google.maps.event.addDomListener(this.polygonObj, 'click', event => {
			if(!this.isDragging) {
				this._trigger('polygon_clicked', this, event, false);
			}
		}));

		this.events.push(google.maps.event.addDomListener(this.polygonObj, 'rightclick', event => {
			if(event.vertex !== null && event.vertex !== undefined) {
				if(polygonPath.length == 2) {
					this.remove();
				} else {
					polygonPath.removeAt(event.vertex);
				}
			} else {
				this._trigger('polygon_clicked', this, event, true);
			}
		}));
	}

	_removeListeners() {
		this.events.forEach(event => {
			google.maps.event.removeListener(event);
		});

		this.events = new Array;
	}

	_coordFromJson(coord) {
		coord.lat = parseFloat(coord.lat);
		coord.lng = parseFloat(coord.lng);
		return coord;
	}

	_merge_objects(obj1,obj2){
	    var obj3 = {};
	    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
	    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
	    return obj3;
	}
}

export class PolygonManager {
  constructor(map, options={}) {
  	if(map === null || map === undefined) {
    	throw('You must pass a google map object as the first argument');
    }
    this.map = map;
    this.polygons = new Array;
    this.selectedPolygons = new Array;
    this.events = new Array;
    this.drawColor = options['drawColor'] || '#000';
    this.newPolygonColor = options['newPolygonColor'];
    this.selectMultiple = options['selectMultiple'] || false;
    this.disableDeselect = options['disableDeselect'] || false;

    if(options['editable'] !== null && options['editable'] !== undefined){
    	this.editable = options['editable'];
    } else {
    	this.editable = true;
    }

    this.callbackContext = options['callbackContext'] || this;
    this.callbacks = {
    	ready:			options['onReady'],
    	start_draw:		options['onStartDraw'],
  		finish_draw:        options['onFinishDraw'],
  		cancel_draw:        options['onCancelDraw'],
  		dot_added:          options['onDotAdded'],
  		before_add_polygon: options['beforeAddPolygon'],
  		polygon_added:      options['onPolygonAdded'],
  		polygon_changed:    options['onPolygonChanged'],
  		polygon_clicked:    options['onPolygonClicked'],
  		polygon_selected:   options['onPolygonSelected'],
  		polygon_deselected: options['onPolygonDeselected'],
  		polygon_removed:    options['onPolygonRemoved']
    };

    if(options['polygons'] !== null && options['polygons'] !== undefined) {
    	this.addPolygons(options['polygons'])
    }

    if(!this.editable) {
    	this.polygons.forEach(polygon => {
    		polygon.setEditable(false);
    	});
    }

    this.events.push(google.maps.event.addDomListener(this.map, 'click', event => {
    	if(this.pen === null || this.pen === undefined) {
    		this.deselectAll();
    	}
    }));

    this._trigger('ready', this);
  }

  enableDraw(color=null, newPolygonColor=null) {
  	if(!this.editable) {
  		return;
  	}

  	this.deselectAll();

  	this.pen = new Pen(this.map, {
  		color: color || this.drawColor,
  		callbackContext: this,
  		onStartDraw: this.callbacks['start_draw'],
  		onFinishDraw: this._finishDraw,
  		onCancelDraw: this._cancelDraw,
  		onDotAdded: this.callbacks['dot_added']
  	});

  	this.map.setOptions({draggableCursor: 'pointer'});
  }

  setPolygons(polygons) {
  	this.reset();
  	this.addPolygons(polygons);
  }

  addPolygon(polygon_or_object, runCallback=true) {
  	let polygon = (polygon_or_object instanceof Polygon ? polygon_or_object : this._objectToPolygon(polygon_or_object));

  	if(this._trigger('before_add_polygon', polygon)) {
  		polygon.setMap(this.map);
  		polygon.callbackContext = this;
  		polygon.on('polygon_changed', this.callbacks['polygon_changed']);
  		polygon.on('polygon_clicked', this._polygonClicked);
  		polygon.on('polygon_selected', this.callbacks['polygon_selected']);
  		polygon.on('polygon_deselected', this.callbacks['polygon_deselected']);
  		polygon.on('polygon_removed', this.callbacks['polygon_removed']);
  		this.polygons.push(polygon);
  		
  		if(runCallback) {
  			this._trigger('polygon_added', polygon);
  		}
  		
  		return polygon;
  	}
  }

  addPolygons(polygons, runIndividualCallbacks=true) {
  	polygons.forEach(polygon => {
  		this.addPolygon(polygon, runIndividualCallbacks);
  	});
  }

  getPolygonById(id) {
  	this.polygons.forEach(polygon => {
  		if(polygon.id === id) {
  			return polygon;
  		}
  	});
  }

  getSelectedPolygon() {
  	return this.selectedPolygons[0];
  }

  getSelectedPolygons() {
  	return this.selectedPolygons;
  }

  deselectPolygon(polygon) {
  	if(!this.disableDeselect) {
	  	polygon.deselect();
	  	this._removeFromArray(this.selectedPolygons, polygon);
  	}
  }

  deselectPolygons(polygonArr) {
  	let polygons = polygonArr.slice(0);
  	polygons.forEach(polygon => {
  		this.deselectPolygon(polygon);
  	});
  }

  deselectAll() {
  	this.deselectPolygons(this.selectedPolygons);
  }

  selectPolygon(polygon, deselectOthers=true) {
  	if(!this.editable) {
  		return polygon;
  	}

  	if(deselectOthers) {
  		this.deselectAll();
  	}

  	polygon.select();
  	this.selectedPolygons.push(polygon);
  	return polygon;
  }

  selectPolygons(polygons) {
  	if(!this.selectMultiple) {
  		return;
  	}

  	this.deselectAll();
  	polygons.forEach(polygon => {
  		this.selectPolygon(polygon);
  	});
  	return polygons;
  }

  removePolygon(polygon) {
  	this.deselectPolygon(polygon);
  	polygon.remove();
  	this._removeFromArray(this.polygons, polygon);
  }

  removePolygons(polygonArr) {
  	let polygons = polygonArr.slice(0);

  	polygons.forEach(polygon => {
  		this.removePolygon(polygon);
  	});
  }

  reset() {
  	this.polygons.forEach(polygon => {
  		if(polygon !== null && polygon !== undefined) {
  			polygon.remove();
  		}
  	});
  	this.polygons = new Array;
  	this._resetCursor();
  }

  destroy() {
  	this.reset();
  	this.events.forEach(event => {
  		google.maps.event.removeListener(event);
  	});
  }

  on(event_name, callback) {
  	this.callbacks[event_name] = callback;
  }

  _trigger() {
  	if(arguments.length == 0) {
  		return true;
  	}

  	let args = new Array;
  	Array.prototype.push.apply(args, arguments);

  	let event_name = args.shift();

  	if(this.callbacks[event_name] !== null && this.callbacks[event_name] !== undefined) {
  		return this.callbacks[event_name].apply(this.callbackContext, args);
  	} else {
  		return true;
  	}
  }

  _removeFromArray(array, obj) {
  	const i = array.indexOf(obj);
  	let res = new Array;
  	if(i != -1) {
  		res = array.splice(i, 1);
  	}
  	return res[0];
  }

  _cancelDraw(pen) {
  	if(this.pen !== null && this.pen !== undefined) {
  		this.pen.remove();
  		this.pen = null;
  	}
  }

  _finishDraw(pen) {
  	this._resetCursor();
  	let polygon = new Polygon(this.pen.listOfDots, {
  		color: this.newPolygonColor
  	});

  	this.addPolygon(polygon);
  	this.selectPolygon(polygon);
  	this.pen.remove();
  	this.pen = null;
  }

  _polygonClicked(polygon, event, rightClick) {
  	if(polygon.isEditable() || rightClick) {
  		this._trigger('polygon_clicked', this, event.latLng, rightClick);
  	} else {
  		let selectMultiple = this.selectMultiple && (event.eb.metaKey || event.eb.shiftKey || event.eb.ctrlKey);
      if(polygon.isEditable()) {
  		  this.deselectPolygon(polygon);
      } else {
        this.selectPolygon(polygon, !selectMultiple);
      }
  	}
  }

  _mapClicked(event) {
  	if(this.pen !== null && this.pen !== undefined) {
  		this.pen.draw(event.latLng);
  	}
  }

  _resetCursor() {
  	this.map.setOptions({draggableCursor: 'url(http://maps.gstatic.com/mapfiles/openhand_8_8.cur) 8 8, default '});
  }

  _objectToPolygon(obj) {
  	return new Polygon(obj['coords'], {id: obj['id'], meta: obj['meta'], color: obj['color']});
  }
}

export default {
  version: '0.1.0',
  Dot: Dot,
  Line: Line,
  Pen: Pen,
  Polygon: Polygon,
  PolygonManager: PolygonManager
};
