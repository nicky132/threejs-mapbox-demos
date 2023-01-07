// This codepen attempts to use THREE.js's raycaster with a Mapbox custom layer. If I've done things correctly,
// hovering over the cube should turn it red. It seems though that the intersection is never detected.
// See: https://github.com/mapbox/mapbox-gl-js/issues/10595

mapboxgl.accessToken = 'pk.eyJ1IjoibmFnaXgiLCJhIjoiY2treGZoNzY5MHE1OTJ4bzQ5NmYyY2twNiJ9.ZX7a6VWavDoOMbDoRR7IOg';
var map = new mapboxgl.Map({
  container: 'map',
  zoom: 14,
  center: [139.7670, 35.6814],
  pitch: 30,
  style: 'mapbox://styles/mapbox/streets-v10'
});

const mouse = new THREE.Vector4(-1000, -1000, 1, 1);

// parameters to ensure the model is georeferenced correctly on the map
var modelOrigin = [139.7670, 35.6814];
var modelAltitude = 150;

var modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
  modelOrigin,
  modelAltitude
);

// transformation parameters to position, rotate and scale the 3D model onto the map
var modelTransform = {
  translateX: modelAsMercatorCoordinate.x,
  translateY: modelAsMercatorCoordinate.y,
  translateZ: modelAsMercatorCoordinate.z,
  /* Since our 3D model is in real world meters, a scale transform needs to be
   * applied since the CustomLayerInterface expects units in MercatorCoordinates.
   */
  scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
};

// configuration of the custom layer for a 3D model per the CustomLayerInterface
var customLayer = {
  id: '3d-model',
  type: 'custom',
  renderingMode: '3d',
  onAdd: function(map, gl) {
    this.camera = new THREE.PerspectiveCamera();
    this.scene = new THREE.Scene();
    var cube = new THREE.Mesh(
    	new THREE.BoxGeometry( 300, 300, 300 ),
        new THREE.MeshNormalMaterial()
    );
    this.scene.add(cube)
    let cube1 = cube.clone();
    cube1.material = new THREE.MeshNormalMaterial();
    cube1.translateX(1000);
    this.scene.add(cube1)

    this.map = map;

    // use the Mapbox GL JS map canvas for three.js
    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true
    });

    this.renderer.autoClear = false;
    this.raycaster = new THREE.Raycaster();
  },
  render: function(gl, matrix) {
    var m = new THREE.Matrix4().fromArray(matrix);
    var l = new THREE.Matrix4()
      .makeTranslation(
        modelTransform.translateX,
        modelTransform.translateY,
        modelTransform.translateZ
      )
      .scale(
        new THREE.Vector3(
          modelTransform.scale,
          -modelTransform.scale,
          modelTransform.scale
        )
      );
    
    this.camera.projectionMatrix = m.clone().multiply(l);
    this.camera.matrixWorldInverse = new THREE.Matrix4();
    this.renderer.resetState();

    const freeCamera = this.map.getFreeCameraOptions();
    let cameraPosition = new THREE.Vector4(freeCamera.position.x, freeCamera.position.y, freeCamera.position.z, 1);
    cameraPosition.applyMatrix4(l.invert());
    let direction = mouse.clone().applyMatrix4(this.camera.projectionMatrix.clone().invert());
    direction.divideScalar(direction.w);
    this.raycaster.set(cameraPosition, direction.sub(cameraPosition).normalize());

    const intersects = this.raycaster.intersectObjects( this.scene.children );
    console.log('Intersection count:', intersects.length)

    for ( let i = 0; i < intersects.length; i ++ ) {
      intersects[ i ].object.material.wireframe = true;
    }
    
    this.renderer.render(this.scene, this.camera);

    for ( let i = 0; i < intersects.length; i ++ ) {
      intersects[ i ].object.material.wireframe = false;
    }
  }
};

map.on('load', function() {
  map.addLayer(customLayer);
  
  map.on('mousemove', function (event) {
    mouse.x = ( event.point.x / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.point.y / window.innerHeight ) * 2 + 1;
    map.triggerRepaint();
  });
});