const SpotifyWebApi = require("spotify-web-api-node");

const credentials = {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI,
};

exports.spotify_login = function (req, res) {
    let spotifyAPI = new SpotifyWebApi(credentials);
    const code = req.body.code;
    spotifyAPI
        .authorizationCodeGrant(code)
        .then((data) => {
            res.json({ accessToken: data.body.access_token });
        })
        .catch((err) => {
            console.error(err);
            res.send(err).status(400);
        });
};
