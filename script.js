document.addEventListener("DOMContentLoaded", () => {
    console.log("KAIRO SCRIPT NOVO FUNCIONANDO");

    const popular = document.getElementById("popular-grid");

    if (popular) {
        popular.innerHTML = `
            <div class="error-message">
                SCRIPT NOVO FUNCIONANDO 🔥
            </div>
        `;
    }
});
