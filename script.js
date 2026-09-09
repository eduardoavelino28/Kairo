fetch("https://api.jikan.moe/v4/top/anime?limit=6")
    .then(resposta => resposta.json())
    .then(dados => {
        console.log(dados);

        document.getElementById("popular-grid").innerHTML =
            "<p>Jikan conectado! " + dados.data[0].title + "</p>";
    })
    .catch(erro => {
        console.error(erro);

        document.getElementById("popular-grid").innerHTML =
            "<p>Erro ao conectar com a Jikan.</p>";
    });
