var renderer	= new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

	var onRenderFcts= [];
	var scene	= new THREE.Scene();
	var camera	= new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);
	camera.position.z = 8;
	
	//////////////////////////////////////////////////////////////////////////////////
	//		Init camera controls
	//////////////////////////////////////////////////////////////////////////////////
	var controls	= new THREE.OrbitControls(camera)
	onRenderFcts.push(function(){
		controls.update()
	})

	//////////////////////////////////////////////////////////////////////////////////
	//		Comment								//
	//////////////////////////////////////////////////////////////////////////////////
	var colliderSystem	= new THREEx.ColliderSystem()
	onRenderFcts.push(function(){
		// build colliders 
		// - here you use your own data structure, threex.colliders.js doesnt care
		var colliders	= []
		scene.traverse(function(object3d){
			var collider	= object3d.userData.collider
			if( collider === undefined )	return
			colliders.push( collider )
		})
		
		// update the colliderSystem
		colliderSystem.computeAndNotify(colliders)
	})

	//////////////////////////////////////////////////////////////////////////////////
	//		Build all objects
	//////////////////////////////////////////////////////////////////////////////////
	;(function(){
		// without objectReuseEnabled
		// buildRow(new THREE.Vector3(-3.5, 1.2,0), -1.5,-0.5, true)
		buildRow(new THREE.Vector3( 0.0, 1.2,0), -1.5, 1.5, true)
		// buildRow(new THREE.Vector3( 3.5, 1.2,0),  0.5, 1.5, true)

		// without objectReuseEnabled to trigger contactRemoved
		// buildRow(new THREE.Vector3(-3.5, -1.2,0), -1.5,-0.5, false)
		// buildRow(new THREE.Vector3( 0.0, -1.2,0), -1.5, 1.5, false)
		// buildRow(new THREE.Vector3( 3.5, -1.2,0),  0.5, 1.5, false)
		return
		function buildRow(position, startX, endX, objectReuseEnabled){
			// build static object
			var object3d	= createObject3d()
			addObject3D(object3d)
			object3d.position.copy(position)

			// build moving object
			var object3d	= createObject3d()
			object3d.position.copy(position)
			addObject3D(object3d)

			object3d.position.x	+= startX
			// object3d.position.y	+= 0.3

			// make it move
			onRenderFcts.push(function(delta){
				// update object position
				var speed	= (endX - startX)/3
				object3d.position.x	+= delta * speed

				// detect if the object MUST be reset
				if( object3d.position.x >= position.x + endX ){
					if( objectReuseEnabled === false ){
						destroyObject3d(object3d)
						object3d	= createObject3d()
						addObject3D(object3d)				
					}
					object3d.position.copy(position)
					object3d.position.x	+= startX
				}
			})

		}
	})()

	//////////////////////////////////////////////////////////////////////////////////
	//		update all object3d
	//////////////////////////////////////////////////////////////////////////////////
	onRenderFcts.push(function(delta){
		var objects	= []
		// traverse the scene and update object with colliders
		scene.traverse(function(object3d){
			if( object3d.userData.collider === undefined )	return
			objects.push(object3d)
		})

		// traverse the scene and update object with colliders
		objects.forEach(function(object3d){
			updateObject3D(object3d, delta)
		})
	})

	//////////////////////////////////////////////////////////////////////////////////
	//		Comment								//
	//////////////////////////////////////////////////////////////////////////////////
	function updateObject3D(object3d, delta){
		// make it move
		var velocity	= object3d.userData.velocity
		var movement	= velocity.clone().multiplyScalar(delta)
		object3d.position.add(movement)

		// update the collider
		var collider	= object3d.userData.collider
		collider.update()

		// update the helper
		var helper	= object3d.userData.helper
		helper.update()	
	}
	
	function addObject3D(object3d){

		// add the object to the scene
		scene.add(object3d)

		// log to debug
		// console.log('objectAdded', object3d)

		// add the helper
		var helper	= object3d.userData.helper
		scene.add(helper)
	}

	function destroyObject3d(object3d){
		// log to debug
		// console.log('objectRemoved', object3d)

		// add the object to the scene
		scene.remove(object3d)
		object3d.material.dispose()
		object3d.geometry.dispose()

		// remove helper
		var helper	= object3d.userData.helper
		scene.remove(helper)
		helper.dispose()
	}

	//////////////////////////////////////////////////////////////////////////////////
	//		Comment								//
	//////////////////////////////////////////////////////////////////////////////////

	function createObject3d(){
		// create object3d
		// var geometry	= new THREE.TorusKnotGeometry(0.5-0.12, 0.12)
		var geometry	= new THREE.SphereGeometry(0.5, 32, 16)
		var material	= new THREE.MeshNormalMaterial();
		var object3d	= new THREE.Mesh( geometry, material );

		// set initial velocity
		object3d.userData.velocity	= new THREE.Vector3()

		//////////////////////////////////////////////////////////////////////////////////
		//		Create a collider
		//////////////////////////////////////////////////////////////////////////////////

		// init collider
		var collider	= THREEx.Collider.createFromObject3d(object3d)
		object3d.userData.collider	= collider

		// init collider helper
		var helper	= new THREEx.ColliderHelper(collider)
		object3d.userData.helper	= helper
		helper.material.color.set('green')

		//////////////////////////////////////////////////////////////////////////////////
		//		event binding for colliders
		//////////////////////////////////////////////////////////////////////////////////
		collider.addEventListener('contactEnter', function(otherCollider){
			helper.material.color.set('red')
			helper.material.wireframeLinewidth = 1
		})
		collider.addEventListener('contactExit', function(otherCollider){
			helper.material.color.set('green')
			helper.material.wireframeLinewidth = 1
		})
		collider.addEventListener('contactRemoved', function(otherColliderId){
			helper.material.color.set('blue')
			helper.material.wireframeLinewidth = 1
		})
		collider.addEventListener('contactStay', function(otherCollider){
			helper.material.wireframeLinewidth = 3
		})

		// return the just built object
		return object3d
	}


	//////////////////////////////////////////////////////////////////////////////////
	//		render the scene						//
	//////////////////////////////////////////////////////////////////////////////////
	onRenderFcts.push(function(){
		renderer.render( scene, camera );		
	})
	
	//////////////////////////////////////////////////////////////////////////////////
	//		loop runner							//
	//////////////////////////////////////////////////////////////////////////////////
	// var lastTimeMsec= null
	// requestAnimationFrame(function animate(nowMsec){
	// 	// keep looping
	// 	requestAnimationFrame( animate );
	// 	// measure time
	// 	lastTimeMsec	= lastTimeMsec || nowMsec-1000/60
	// 	var deltaMsec	= Math.min(200, nowMsec - lastTimeMsec)
	// 	lastTimeMsec	= nowMsec
	// 	// call each update function
	// 	onRenderFcts.forEach(function(onRenderFct){
	// 		onRenderFct(deltaMsec/1000, nowMsec/1000)
	// 	})
	// })