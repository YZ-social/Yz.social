# Yz.social

> _This repo location is temporary, and will be brought over to the [YZ.social repo](https://github.com/YZ-social/YZ.social)._

## The App

Wise social lets you report immediate danger to the public by tapping a location on the map.

The locations are shared over anonymous p2p with other users in your area, and fade away over 10 minutes.
There is no login and no global tracking of Internet address or physical location.

## The Implementation

Some apps of this type have been removed from mobile app stores, while others remain. This is implemented as a Web page, so that it does not have to go through an app store.

Additionally, the source code is available right here so that a mirror can be hosted by anywone. 

The cool thing about the implementation, though, is that all the mirrors share the same data through peer-to-peer connections. There is no central database to be brought down. _FIXME: Current version does not work this way yet._

## Running a Mirror

You can run a complete application server with:

```
npm install yz.social # Oops! FIXME Not published to npm yet!
# or
git clone https://github.com/YZ-social/Yz.social.git; cd Yz.social
npm start # Now visit http://localhost:3000
```

However, to visit the page on another device, the server must use `https`. This is usually done with a front end (aka reverse proxy server) such as nginx or OpenResty, and most commercial setups already operate this way.

The application server does a few things:
1. It serves the static client files.
2. It provides a means of connecting to the p2p network that is shared among all the mirrors.

This is done with a very minimal ExpressJS server. If you already have such a server set up, you can just:
1. Add or link public/ to the directory of static client files already being served. E.g., 
  - If you want to serve the static client files from an nginx front end, you can specify `root path_to_yz.social_directory/public;` in your nginx.conf.
  - If you want to serve the static client files from an existing ExpressJS app server, you can specify `app.use(express.static(path_to_yz.social_directory/public));`
2. Add the router FIXME.
