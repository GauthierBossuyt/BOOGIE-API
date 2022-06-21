## BOOGIE API 💾

## Description :memo:

The Boogie API is part of my larger project Boogie. Boogie is a project aimed to enhance the Spotify experience by giving everyone a voice. This repository contains the backend used for Boogie consisting of a **[mongoDB](https://www.mongodb.com/)** database, an **[express.js](https://expressjs.com/)** server and **[sockets](https://socket.io/)**.

#

## Getting Started :rocket:

A step-by-step guide to launch my project.

1. Start by creating an .env file, based on the .example-env file.
2. Open a command prompt and make sure the path links to the projects folder. Use the next command to install the required packages `npm install`.
3. run the sever with the `npm start` command.

#

## Routing :speech_balloon:

```http
GET /
```

```javascript
{
  "name" : "Boogie-api",
  "time" : Date.now(),
}
```

#

#### _LOGIN ROUTES_

```http
POST /spotify
```

| Parameter     | Type     | Description                                               |
| :------------ | :------- | :-------------------------------------------------------- |
| `code`        | `string` | **Required** Code provided from the Spotify oauth         |
| `access_token | `string` | **Required** Access token provided from the Spotify oauth |

#

#### _ROOM ROUTES_

```http
GET /room
```

| Parameter | Type     | Description                 |
| :-------- | :------- | :-------------------------- |
| `code`    | `string` | **Required** The room code. |

```javascript
{
  "room" : object
}
```

```http
POST /songs
```

| Parameter | Type     | Description                                              |
| :-------- | :------- | :------------------------------------------------------- |
| `room`    | `object` | **Required** Object containing all the song information. |

```http
DELETE /songs
```

| Parameter | Type     | Description                 |
| :-------- | :------- | :-------------------------- |
| `code`    | `string` | **Required** The room code. |

#

##### _UPDATE ROUTE_

```http
PATCH /update
```

| Parameter  | Type     | Description                                   |
| :--------- | :------- | :-------------------------------------------- |
| `type`     | `string` | **Required** Type of update (host / song).    |
| `code`     | `string` | **Required** The room code.                   |
| `songdata` | `object` | **Required** Object containing the song data. |
| `host`     | `string` | **Required** Name of the (new) host.          |

#

### _Objects_

##### ROOM OBJECT

```javascript
{
  "email" : string,
  "host" : string,
  "name": string,
  "Description": string,
  "party": boolean,
  "code": string,
  "Q_songs"  :integer,
  "Q_votes": integer,
  "joined_members": array,
  "played_songs": array,
  "song_most_votes": object
}
```

### _STATUS CODES_

| Status Code | Description             |
| :---------- | :---------------------- |
| 200         | `OK`                    |
| 400         | `BAD REQUEST`           |
| 404         | `NOT FOUND`             |
| 500         | `INTERNAL SERVER ERROR` |

#

## Roadmap :round_pushpin:

- [x] Basic Routing
- [x] Connection with Database
- [x] Socket Connection
- [x] Room Routes
- [ ] Nexrender server connected with workers

#

## Status :white_check_mark:

This project is still in development, so the some things might be unstable. The core funtionalities should be working smoothly.

#

## Contribution :trophy:

- Bug rapporting is always welcome.
- Suggesting new features.

#

## Code of Conduct :black_nib:

Any violation of the following rules will result in a suspension.

- **Be kind**
  _Giving constructive feedback is good. Make sure to evaluate what you're doing before u post_

- **Respect other humans**
  _This includes: hate speech, discriminatory language based on gender, religion, ethnicity or sex_

#

## Author :eyes:

My name is **Gauthier Bossuyt** and I am a third year Multimedia and Creative Technologies student at the Erasmus University College Brussels. During my education, I had courses in web design and development, motion design, live visuals and motion capture. If you have any questions feel free to **[contact me](mailto:gauthier.bossuyt@student.ehb.be)**.
