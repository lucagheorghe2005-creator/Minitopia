(function () {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 15);
    camera.lookAt(0, 0, 0);

    const starsGeo = new THREE.BufferGeometry();
    const starsCount = 400;
    const pos = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i += 3) {
        pos[i] = (Math.random() - 0.5) * 50;
        pos[i + 1] = (Math.random() - 0.5) * 35;
        pos[i + 2] = (Math.random() - 0.5) * 40 - 10;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const starsMat = new THREE.PointsMaterial({
        color: 0xfff5d1,
        size: 0.12,
        transparent: true,
        opacity: 0.9
    });
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    function animate() {
        stars.rotation.y += 0.0003;
        stars.rotation.x += 0.0001;
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }
    animate();

    document.addEventListener('mousemove', (e) => {
        const mx = (e.clientX / window.innerWidth) * 2 - 1;
        const my = -(e.clientY / window.innerHeight) * 2 + 1;
        camera.position.x += (mx * 2.5 - camera.position.x) * 0.01;
        camera.position.y += (my * 1.8 + 2 - camera.position.y) * 0.01;
        camera.lookAt(0, 0, 0);
    });

    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });
})();

(function () {
    const darkenOverlay = document.getElementById('darkenOverlay');
    function updateScrollEffects() {
        const scrollY = window.scrollY;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        let progress = maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0;
        if (darkenOverlay) darkenOverlay.style.opacity = (progress * 0.25).toFixed(2);

        const r = Math.round(255 + (168 - 255) * progress);
        const g = Math.round(160 + (230 - 160) * progress);
        const b = Math.round(122 + (207 - 122) * progress);
        document.documentElement.style.setProperty('--bg-color', `rgb(${r}, ${g}, ${b})`);
    }
    window.addEventListener('scroll', updateScrollEffects);
    updateScrollEffects();
})();

(function () {
    const introOverlay = document.getElementById('introOverlay');
    const logoBubble = document.getElementById('logoBubble');

    function fireConfetti() {
        if (typeof confetti === 'undefined') return;
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, colors: ['#ff6ec7', '#a855f7', '#f97316', '#22d3ee', '#facc15', '#fb7185'] });
        confetti({ particleCount: 100, spread: 130, origin: { y: 0.5, x: 0.2 }, colors: ['#a855f7', '#ff6ec7', '#4ade80'] });
        confetti({ particleCount: 100, spread: 130, origin: { y: 0.5, x: 0.8 }, colors: ['#f97316', '#facc15', '#22d3ee'] });
        setTimeout(() => {
            document.querySelectorAll('canvas').forEach(c => { if (c.id !== 'bg-canvas') c.style.zIndex = '10000'; });
        }, 10);
    }

    function showIntro() {
        if (!introOverlay) return;
        introOverlay.classList.add('active');
        fireConfetti();
    }
    function hideIntro() {
        if (!introOverlay) return;
        introOverlay.classList.remove('active');
    }

    if (logoBubble) {
        logoBubble.addEventListener('click', (e) => {
            e.preventDefault();
            showIntro();
            setTimeout(hideIntro, 2800);
            setTimeout(() => fireConfetti(), 400);
            setTimeout(() => fireConfetti(), 800);
        });
    }

    if (introOverlay) {
        introOverlay.addEventListener('click', (e) => {
            if (e.target === introOverlay) hideIntro();
        });
    }
})();

(function () {
    const cards = document.querySelectorAll('.card[data-package]');
    const packageSelect = document.getElementById('packageSelect');
    const kidsInput = document.getElementById('kids');
    const totalSpan = document.getElementById('totalAmount');
    const kidsError = document.getElementById('kidsError');

    function validateKids(showError = true) {
        if (!kidsInput) return false;
        const rawValue = kidsInput.value.trim();
        if (rawValue === '') {
            if (showError && kidsError) kidsError.classList.add('show');
            return false;
        }
        const val = parseInt(rawValue, 10);
        const isValid = !isNaN(val) && val >= 1 && val <= 20;
        if (showError && kidsError) kidsError.classList.toggle('show', !isValid);
        return isValid;
    }

    function updateTotal() {
        if (!packageSelect || !kidsInput || !totalSpan) return;
        const pkg = packageSelect.value;
        const isValid = validateKids(true);
        let kids = parseInt(kidsInput.value, 10);
        if (isNaN(kids)) kids = 0;

        let total = 0;
        if (pkg === 'party' && isValid) total = 900;
        else if (pkg === 'explorator' && isValid) total = 50 * kids;
        else if (pkg === 'aventura' && isValid) total = 120 * kids;
        totalSpan.textContent = total + ' lei';
    }

    cards.forEach(card => {
        card.addEventListener('click', function () {
            const pkg = this.getAttribute('data-package');
            if (packageSelect) packageSelect.value = pkg;
            updateTotal();
            document.getElementById('rezervari').scrollIntoView({ behavior: 'smooth' });
        });
    });

    if (packageSelect) packageSelect.addEventListener('change', updateTotal);
    if (kidsInput) {
        kidsInput.addEventListener('input', () => {
            validateKids(true);
            updateTotal();
        });
        kidsInput.addEventListener('blur', () => validateKids(true));
    }

    const form = document.getElementById('reservationForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!packageSelect.value) { alert('Te rog selectează un pachet!'); return; }
            if (!validateKids(true)) { if (kidsInput) kidsInput.focus(); return; }
            alert('🎉 Rezervarea ta a fost trimisă! Te vom contacta în curând.');
            form.reset();
            if (kidsInput) kidsInput.value = '';
            if (totalSpan) totalSpan.textContent = '0 lei';
            if (kidsError) kidsError.classList.remove('show');
        });
    }

    updateTotal();
})();

(function () {
    const backBtn = document.getElementById('backToTop');
    if (backBtn) {
        window.addEventListener('scroll', () => {
            backBtn.classList.toggle('show', window.scrollY > 300);
        });
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
})();