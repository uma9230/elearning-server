import { expressjwt } from "express-jwt";

export const requireSignin = expressjwt({
  getToken: (req, res) => req.cookies.token,
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"],
});

//if we receive the valid token then this will give us req.user and from there we can get the id (req.user._id), but if valid token is not recieved then it will throw an error...
//import { expressjwt } from 'express-jwt'
