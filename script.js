document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    let imageTimeline = []; // Stores base64 URLs of generated images
    let currentYearIndex = 0;
    let isGenerating = false;
    let cameraStream = null;

    // --- DOM ELEMENTS ---
    const initialView = document.getElementById('initial-view');
    const uploadButton = document.getElementById('upload-button');
    const fileInput = document.getElementById('file-input');
    const cameraButton = document.getElementById('camera-button');

    const cameraView = document.getElementById('camera-view');
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const captureButton = document.getElementById('capture-button');
    const cancelCameraButton = document.getElementById('cancel-camera-button');

    const timelineView = document.getElementById('timeline-view');
    const timelineImage = document.getElementById('timeline-image');
    const yearDisplay = document.getElementById('year-display');
    const prevYearButton = document.getElementById('prev-year-button');
    const nextYearButton = document.getElementById('next-year-button');
    const loadingOverlay = document.getElementById('loading-overlay');
    const startOverButton = document.getElementById('start-over-button');

    // --- EVENT LISTENERS ---
    uploadButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    cameraButton.addEventListener('click', startCamera);
    cancelCameraButton.addEventListener('click', stopCamera);
    captureButton.addEventListener('click', captureImage);
    prevYearButton.addEventListener('click', showPrevYear);
    nextYearButton.addEventListener('click', showNextYear);
    startOverButton.addEventListener('click', resetApp);

    // --- FUNCTIONS ---

    /**
     * Converts a URL to a base64 data URL.
     * @param {string} url The URL to convert.
     * @returns {Promise<string>} A promise that resolves with the data URL.
     */
    async function urlToDataUrl(url) {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                startTimeline(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    }

    async function startCamera() {
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            video.srcObject = cameraStream;
            initialView.classList.add('hidden');
            cameraView.classList.remove('hidden');
        } catch (err) {
            console.error("Error accessing camera: ", err);
            alert("Could not access camera. Please check permissions.");
        }
    }

    function stopCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
        cameraView.classList.add('hidden');
        initialView.classList.remove('hidden');
    }

    function captureImage() {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        stopCamera();
        startTimeline(dataUrl);
    }
    
    function startTimeline(base64Image) {
        initialView.classList.add('hidden');
        cameraView.classList.add('hidden');
        timelineView.classList.remove('hidden');
        
        imageTimeline = [base64Image];
        currentYearIndex = 0;
        updateDisplay();
    }

    function updateDisplay() {
        timelineImage.src = imageTimeline[currentYearIndex];
        
        if (currentYearIndex === 0) {
            yearDisplay.textContent = 'Present Day';
        } else {
            yearDisplay.textContent = `+${currentYearIndex} Year${currentYearIndex > 1 ? 's' : ''}`;
        }

        prevYearButton.disabled = currentYearIndex === 0;
        nextYearButton.disabled = isGenerating;
    }

    function showPrevYear() {
        if (currentYearIndex > 0) {
            currentYearIndex--;
            updateDisplay();
        }
    }

    function showNextYear() {
        if (isGenerating) return;

        // If we have already generated the next year, just show it
        if (currentYearIndex < imageTimeline.length - 1) {
            currentYearIndex++;
            updateDisplay();
        } else {
            // Otherwise, generate a new image
            generateNextYear();
        }
    }

    async function generateNextYear() {
        isGenerating = true;
        loadingOverlay.classList.remove('hidden');
        updateDisplay();

        const lastImage = imageTimeline[imageTimeline.length - 1];

        try {
            const result = await websim.imageGen({
                prompt: "Make the person in this photo look exactly one year older. Keep the same pose, lighting, expression, and background. Do not add any text or artifacts.",
                image_inputs: [{ url: lastImage }],
                aspect_ratio: "1:1"
            });
            
            // The result URL must be converted to a data URL for the next generation step.
            const newImageAsDataUrl = await urlToDataUrl(result.url);
            imageTimeline.push(newImageAsDataUrl);
            currentYearIndex++;
        } catch (error) {
            console.error("Image generation failed:", error);
            alert("Sorry, we couldn't generate the next image. Please try again.");
        } finally {
            isGenerating = false;
            loadingOverlay.classList.add('hidden');
            updateDisplay();
        }
    }
    
    function resetApp() {
        stopCamera();
        imageTimeline = [];
        currentYearIndex = 0;
        isGenerating = false;
        
        timelineView.classList.add('hidden');
        cameraView.classList.add('hidden');
        initialView.classList.remove('hidden');
        
        fileInput.value = ''; // Reset file input
        loadingOverlay.classList.add('hidden');
    }
});