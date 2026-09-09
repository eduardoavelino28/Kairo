const API = "https://api.jikan.moe/v4";


// =========================
// FUNÇÕES GERAIS
// =========================

function getAnimeId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

function escapeHTML(text) {
    if (!text) return "";

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// =========================
// MINHA LISTA
// =========================

function getFavorites() {
    try {
        return JSON.parse(
            localStorage.getItem("kairo_favorites")
        ) || [];
    } catch {
        return [];
    }
}

function saveFavorites(favorites) {
    localStorage.setItem(
        "kairo_favorites",
        JSON.stringify(favorites)
    );
}

function isFavorite(id) {
    return getFavorites().includes(Number(id));
}

function toggleFavorite(id) {

    id = Number(id);

    let favorites = getFavorites();

    if (favorites.includes(id)) {
        favorites = favorites.filter(
            item => item !== id
        );
    } else {
        favorites.push(id);
    }

    saveFavorites(favorites);

    return favorites.includes(id);
}


// =========================
// CRIAR CARD
// =========================

function createAnimeCard(anime) {

    const image =
        anime.images?.webp?.large_image_url ||
        anime.images?.jpg?.large_image_url ||
        "";

    const title =
        anime.title ||
        "Título desconhecido";

    const score =
        anime.score != null
            ? Number(anime.score).toFixed(1)
            : "—";

    const year =
        anime.year ||
        anime.aired?.prop?.from?.year ||
        "";

    const type =
        anime.type ||
        "Anime";

    return `
        <a href="anime.html?id=${anime.mal_id}" class="anime-card">

            <div class="anime-poster">
                <img
                    src="${image}"
                    alt="${escapeHTML(title)}"
                    loading="lazy"
                >
            </div>

            <div class="anime-info">

                <div class="anime-title">
                    ${escapeHTML(title)}
                </div>

                <div class="anime-meta">

                    <span class="anime-rating">
                        ⭐ ${score}
                    </span>

                    ${year ? `<span>${year}</span>` : ""}

                    <span class="anime-type">
                        ${escapeHTML(type)}
                    </span>

                </div>

            </div>

        </a>
    `;
}


// =========================
// MOSTRAR CARDS
// =========================

function renderAnimeList(id, animes) {

    const container =
        document.getElementById(id);

    if (!container) return;

    if (!animes || animes.length === 0) {

        container.innerHTML = `
            <div class="error-message">
                Nenhum anime encontrado.
            </div>
        `;

        return;
    }

    container.innerHTML =
        animes.map(createAnimeCard).join("");
}


// =========================
// CARREGAR JIKAN
// =========================

async function fetchJikan(url) {

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Jikan respondeu com ${response.status}`
        );
    }

    return await response.json();
}


// =========================
// POPULARES
// =========================

async function loadPopular() {

    const container =
        document.getElementById("popular-grid");

    if (!container) return;

    try {

        const result = await fetchJikan(
            `${API}/top/anime?limit=6`
        );

        renderAnimeList(
            "popular-grid",
            result.data
        );

    } catch (error) {

        console.error(
            "Erro em Populares:",
            error
        );

        container.innerHTML = `
            <div class="error-message">
                Não foi possível carregar os populares.
            </div>
        `;
    }
}


// =========================
// MAIS AVALIADOS
// =========================

async function loadTopRated() {

    const container =
        document.getElementById("top-grid");

    if (!container) return;

    try {

        const result = await fetchJikan(
            `${API}/top/anime?limit=25`
        );

        const animes =
            result.data
                .filter(anime => anime.score != null)
                .sort(
                    (a, b) => b.score - a.score
                )
                .slice(0, 6);

        renderAnimeList(
            "top-grid",
            animes
        );

    } catch (error) {

        console.error(
            "Erro em Mais avaliados:",
            error
        );

        container.innerHTML = `
            <div class="error-message">
                Não foi possível carregar os mais avaliados.
            </div>
        `;
    }
}


// =========================
// LANÇAMENTOS
// =========================

async function loadNewAnime() {

    const container =
        document.getElementById("new-grid");

    if (!container) return;

    try {

        const result = await fetchJikan(
            `${API}/seasons/now?limit=6`
        );

        renderAnimeList(
            "new-grid",
            result.data
        );

    } catch (error) {

        console.error(
            "Erro em Lançamentos:",
            error
        );

        container.innerHTML = `
            <div class="error-message">
                Não foi possível carregar os lançamentos.
            </div>
        `;
    }
}


// =========================
// DETALHES DO ANIME
// =========================

async function loadAnimeDetails() {

    const id = getAnimeId();

    if (!id) {
        showAnimeError(
            "Nenhum anime foi selecionado."
        );
        return;
    }

    try {

        const result = await fetchJikan(
            `${API}/anime/${id}/full`
        );

        displayAnime(result.data);

    } catch (error) {

        console.error(
            "Erro nos detalhes:",
            error
        );

        showAnimeError(
            "Não foi possível carregar este anime."
        );
    }
}


// =========================
// MOSTRAR DETALHES
// =========================

function displayAnime(anime) {

    const loading =
        document.getElementById("anime-loading");

    const content =
        document.getElementById("anime-content");

    if (!loading || !content) return;


    const title =
        anime.title || "Anime";


    const image =
        anime.images?.webp?.large_image_url ||
        anime.images?.jpg?.large_image_url ||
        "";


    document.title =
        `KAIRO — ${title}`;


    document.getElementById(
        "anime-image"
    ).src = image;


    document.getElementById(
        "anime-image"
    ).alt = title;


    document.getElementById(
        "anime-title"
    ).textContent = title;


    document.getElementById(
        "anime-rating"
    ).textContent =
        `⭐ ${anime.score != null
            ? Number(anime.score).toFixed(1)
            : "—"}`;


    document.getElementById(
        "anime-episodes"
    ).textContent =
        `🎬 ${anime.episodes ?? "—"} episódios`;


    document.getElementById(
        "anime-year"
    ).textContent =
        `📅 ${
            anime.year ||
            anime.aired?.prop?.from?.year ||
            "—"
        }`;


    document.getElementById(
        "anime-status"
    ).textContent =
        `📌 ${anime.status || "—"}`;


    document.getElementById(
        "anime-synopsis"
    ).textContent =
        anime.synopsis ||
        "Sinopse não disponível.";


    const type =
        document.getElementById("anime-type");

    if (type) {
        type.textContent =
            anime.type || "Anime";
    }


    const genres =
        document.getElementById("anime-genres");

    if (genres) {

        genres.innerHTML =
            (anime.genres || [])
                .map(genre => `
                    <span class="genre">
                        ${escapeHTML(genre.name)}
                    </span>
                `)
                .join("");
    }


    loading.classList.add("hidden");
    content.classList.remove("hidden");


    setupFavorite(anime.mal_id);
    setupTrailer(anime);
}


// =========================
// FAVORITO
// =========================

function setupFavorite(id) {

    const button =
        document.getElementById(
            "favorite-button"
        );

    if (!button) return;


    function update() {

        button.textContent =
            isFavorite(id)
                ? "✓ Na minha lista"
                : "＋ Minha lista";
    }


    update();


    button.onclick = () => {

        toggleFavorite(id);

        update();
    };
}


// =========================
// TRAILER
// =========================

function setupTrailer(anime) {

    const section =
        document.getElementById(
            "trailer-section"
        );

    const iframe =
        document.getElementById(
            "anime-trailer"
        );

    if (!section || !iframe) return;


    const youtubeId =
        anime.trailer?.youtube_id;


    if (!youtubeId) {

        section.classList.add("hidden");

        return;
    }


    iframe.src =
        `https://www.youtube.com/embed/${youtubeId}`;

    section.classList.remove("hidden");
}


// =========================
// ERRO
// =========================

function showAnimeError(message) {

    const loading =
        document.getElementById(
            "anime-loading"
        );

    if (!loading) return;

    loading.innerHTML = `
        <div class="error-message">
            ${escapeHTML(message)}
        </div>
    `;
}


// =========================
// BOTÃO DA HOME
// =========================

function setupHeroFavorite() {

    const button =
        document.getElementById(
            "hero-favorite"
        );

    if (!button) return;


    const id = 21;


    function update() {

        button.textContent =
            isFavorite(id)
                ? "✓ Na minha lista"
                : "＋ Minha lista";
    }


    update();


    button.onclick = () => {

        toggleFavorite(id);

        update();
    };
}


// =========================
// INICIAR KAIRO
// =========================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        if (
            document.getElementById(
                "popular-grid"
            )
        ) {

            loadPopular();
            loadTopRated();
            loadNewAnime();

            setupHeroFavorite();
        }


        if (
            document.getElementById(
                "anime-content"
            )
        ) {

            loadAnimeDetails();
        }

    }
);
