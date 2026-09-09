const API = "https://api.jikan.moe/v4";


// =========================
// UTILIDADES
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
        return JSON.parse(localStorage.getItem("kairo_favorites")) || [];
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
            favoriteId => favoriteId !== id
        );
    } else {
        favorites.push(id);
    }

    saveFavorites(favorites);

    return favorites.includes(id);
}


// =========================
// CARD DE ANIME
// =========================

function createAnimeCard(anime) {

    const id = anime.mal_id;

    const title =
        anime.title ||
        anime.title_english ||
        "Título desconhecido";

    const image =
        anime.images?.webp?.large_image_url ||
        anime.images?.jpg?.large_image_url ||
        "";

    const score =
        anime.score !== null &&
        anime.score !== undefined
            ? anime.score.toFixed(1)
            : "—";

    const type = anime.type || "Anime";

    const year =
        anime.year ||
        anime.aired?.prop?.from?.year ||
        "";

    return `
        <a
            href="anime.html?id=${id}"
            class="anime-card"
            aria-label="Ver detalhes de ${escapeHTML(title)}"
        >

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
// MOSTRAR ANIMES
// =========================

function renderAnimeList(elementId, animes) {

    const element = document.getElementById(elementId);

    if (!element) return;

    if (!animes || animes.length === 0) {

        element.innerHTML = `
            <div class="error-message">
                Nenhum anime encontrado.
            </div>
        `;

        return;
    }

    element.innerHTML = animes
        .map(createAnimeCard)
        .join("");
}


// =========================
// ERRO
// =========================

function showError(elementId) {

    const element = document.getElementById(elementId);

    if (!element) return;

    element.innerHTML = `
        <div class="error-message">
            Não foi possível carregar os animes agora.
            <br>
            Tente atualizar a página.
        </div>
    `;
}


// =========================
// HOME — POPULARES
// =========================

async function loadPopularAnime() {

    try {

        const response = await fetch(
            `${API}/top/anime?limit=6`
        );

        if (!response.ok) {
            throw new Error("Erro na Jikan");
        }

        const data = await response.json();

        renderAnimeList(
            "popular-grid",
            data.data
        );

    } catch (error) {

        console.error(
            "Erro ao carregar populares:",
            error
        );

        showError("popular-grid");
    }
}


// =========================
// HOME — MAIS AVALIADOS
// =========================

async function loadTopAnime() {

    try {

        const response = await fetch(
            `${API}/top/anime?filter=bypopularity&limit=6`
        );

        if (!response.ok) {
            throw new Error("Erro na Jikan");
        }

        const data = await response.json();

        let animes = data.data || [];

        /*
         * Ordena pela nota da Jikan.
         * Assim temos uma seção realmente focada
         * nos animes melhor avaliados.
         */

        animes = animes
            .filter(anime =>
                anime.score !== null &&
                anime.score !== undefined
            )
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
            "Erro ao carregar mais avaliados:",
            error
        );

        showError("top-grid");
    }
}


// =========================
// HOME — LANÇAMENTOS
// =========================

async function loadNewAnime() {

    try {

        const response = await fetch(
            `${API}/seasons/now?limit=6`
        );

        if (!response.ok) {
            throw new Error("Erro na Jikan");
        }

        const data = await response.json();

        renderAnimeList(
            "new-grid",
            data.data
        );

    } catch (error) {

        console.error(
            "Erro ao carregar lançamentos:",
            error
        );

        showError("new-grid");
    }
}


// =========================
// PÁGINA DE ANIME
// =========================

async function loadAnimeDetails() {

    const id = getAnimeId();

    if (!id) {

        showAnimePageError(
            "Nenhum anime foi selecionado."
        );

        return;
    }

    try {

        const response = await fetch(
            `${API}/anime/${id}/full`
        );

        if (!response.ok) {
            throw new Error("Anime não encontrado");
        }

        const result = await response.json();

        const anime = result.data;

        displayAnimeDetails(anime);

    } catch (error) {

        console.error(
            "Erro ao carregar anime:",
            error
        );

        showAnimePageError(
            "Não foi possível carregar este anime."
        );
    }
}


// =========================
// EXIBIR DETALHES
// =========================

function displayAnimeDetails(anime) {

    const loading =
        document.getElementById("anime-loading");

    const content =
        document.getElementById("anime-content");

    if (!loading || !content) return;


    const title =
        anime.title ||
        anime.title_english ||
        "Anime";


    const image =
        anime.images?.webp?.large_image_url ||
        anime.images?.jpg?.large_image_url ||
        "";


    const score =
        anime.score !== null &&
        anime.score !== undefined
            ? anime.score.toFixed(1)
            : "—";


    const episodes =
        anime.episodes ??
        "—";


    const year =
        anime.year ||
        anime.aired?.prop?.from?.year ||
        "—";


    const status =
        anime.status ||
        "—";


    const synopsis =
        anime.synopsis ||
        "Sinopse não disponível.";


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
        `⭐ ${score}`;


    document.getElementById(
        "anime-episodes"
    ).textContent =
        `🎬 ${episodes} episódios`;


    document.getElementById(
        "anime-year"
    ).textContent =
        `📅 ${year}`;


    document.getElementById(
        "anime-status"
    ).textContent =
        `📌 ${status}`;


    document.getElementById(
        "anime-synopsis"
    ).textContent =
        synopsis;


    // Tipo
    const typeElement =
        document.getElementById("anime-type");

    if (typeElement) {
        typeElement.textContent =
            anime.type || "Anime";
    }


    // Gêneros
    const genresElement =
        document.getElementById("anime-genres");

    if (genresElement) {

        genresElement.innerHTML =
            (anime.genres || [])
                .map(genre => `
                    <span class="genre">
                        ${escapeHTML(genre.name)}
                    </span>
                `)
                .join("");
    }


    // Mostrar conteúdo
    loading.classList.add("hidden");

    content.classList.remove("hidden");


    // Minha lista
    updateFavoriteButton(anime.mal_id);


    const favoriteButton =
        document.getElementById("favorite-button");

    if (favoriteButton) {

        favoriteButton.onclick = () => {

            toggleFavorite(anime.mal_id);

            updateFavoriteButton(
                anime.mal_id
            );
        };
    }


    // Trailer
    setupTrailer(anime);
}


// =========================
// MINHA LISTA — BOTÃO
// =========================

function updateFavoriteButton(id) {

    const button =
        document.getElementById(
            "favorite-button"
        );

    if (!button) return;

    if (isFavorite(id)) {

        button.textContent =
            "✓ Na minha lista";

    } else {

        button.textContent =
            "＋ Minha lista";
    }
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
// ERRO NA PÁGINA DE ANIME
// =========================

function showAnimePageError(message) {

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
// MENU MOBILE
// =========================

function abrirMenu() {

    const nav =
        document.querySelector(".nav");

    if (!nav) return;

    const isOpen =
        nav.classList.toggle("menu-open");

    nav.setAttribute(
        "aria-hidden",
        String(!isOpen)
    );
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


    const animeId = 21;


    function updateButton() {

        if (isFavorite(animeId)) {

            button.textContent =
                "✓ Na minha lista";

        } else {

            button.textContent =
                "＋ Minha lista";
        }
    }


    updateButton();


    button.addEventListener(
        "click",
        () => {

            toggleFavorite(animeId);

            updateButton();
        }
    );
}


// =========================
// INICIALIZAÇÃO
// =========================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const isAnimePage =
            document.getElementById(
                "anime-content"
            );

        const isHomePage =
            document.getElementById(
                "popular-grid"
            );


        if (isHomePage) {

            loadPopularAnime();

            loadTopAnime();

            loadNewAnime();

            setupHeroFavorite();
        }


        if (isAnimePage) {

            loadAnimeDetails();
        }


        const menuButton =
            document.getElementById(
                "menu-button"
            );

        if (menuButton) {

            menuButton.addEventListener(
                "click",
                abrirMenu
            );
        }

    }
);
