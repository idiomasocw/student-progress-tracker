import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const SphereComponent = () => {
  const containerRef = useRef();

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setClearColor(0xffffff, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
      // Clear any previous child elements from the container
  while (containerRef.current.firstChild) {
    containerRef.current.removeChild(containerRef.current.firstChild);
  }
    containerRef.current.appendChild(renderer.domElement);

    // Create a sphere geometry
    const geometry = new THREE.SphereGeometry(1.25, 32, 32);

    // Create a canvas for the texture
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');

    // Draw a gradient on the canvas
    const grd = ctx.createRadialGradient(100, 100, 0, 100, 100, 100);
    grd.addColorStop(0, '#a8e0ff'); // Light Blue
    grd.addColorStop(0.2, '#8ee3f5'); // Slightly darker Light Blue
    grd.addColorStop(0.4, '#70cad1'); // Aqua Blue
    grd.addColorStop(0.6, '#3e517a'); // Darker Blue
    grd.addColorStop(0.8, '#b4d8e7'); // Pale Blue
    grd.addColorStop(1, '#a8e0ff'); // Light Blue
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 200, 200);

    // Create a texture from the canvas
    const texture = new THREE.CanvasTexture(canvas);

    // Apply the texture to a basic material
    const material = new THREE.MeshBasicMaterial({ map: texture });

    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    camera.position.z = 5;

    const animate = () => {
      requestAnimationFrame(animate);

      // Rotate the sphere
      sphere.rotation.x += 0.01;
      sphere.rotation.y += 0.01;

      renderer.render(scene, camera);
    };

    animate();
       
    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
  
    window.addEventListener('resize', onWindowResize);
  
    return () => {
      renderer.dispose();
      window.removeEventListener('resize', onWindowResize);
    };
  }, []);

  return <div ref={containerRef} />;
};

export default SphereComponent;
