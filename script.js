function obGoTo(step) {
    document.querySelectorAll('.ob-step').forEach(s => s.style.display = 'none');
    document.getElementById('ob-step-' + step).style.display = 'block';
}

function obPreview(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('ob-photo-preview');
            preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
            preview.style.borderStyle = 'solid';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function obAddWish() {
    const input = document.getElementById('ob-wish-input');
    if (input.value.trim()) {
        const tag = document.createElement('div');
        tag.className = 'ob-tag';
        tag.innerHTML = `${input.value} <span onclick="this.parentElement.remove()" style="cursor:pointer">&times;</span>`;
        document.getElementById('ob-wish-tags').appendChild(tag);
        input.value = '';
    }
}

function obFinish() {
    alert("¡Bienvenido a Truquo!");
}

 