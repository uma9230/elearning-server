import User from "../models/user";
import { hashPasssword, comparePassword } from "../utils/auth";
import jwt from "jsonwebtoken";
import AWS from "aws-sdk";
import { nanoid } from "nanoid";

const awsConfig = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  apiVersion: process.env.AWS_API_VERSION,
};

const SES = new AWS.SES(awsConfig);

export const register = async (req, res) => {
  try {
    //console.log(req.body);
    const { name, email, password } = req.body;
    // validation----
    if (!name) {
      return res.status(400).send("Name is required");
    }
    if (!password || password.length < 5) {
      return res
        .status(400)
        .send("Password is required & should be minimum 5 characters long");
    }
    let userExists = await User.findOne({ email }).exec();
    if (userExists) {
      return res.status(400).send("Email is taken");
    }

    //hash password
    const hashedPasssword = await hashPasssword(password);

    //register
    const user = new User({
      name,
      email,
      password: hashedPasssword,
    });
    await user.save();
    //console.log("Saved User", user);
    return res.json({ ok: true });
  } catch (err) {
    console.log(err);
    return res.status(400).send("Error. Try again!");
  }
};

export const login = async (req, res) => {
  try {
    // console.log(req.body);
    const { email, password } = req.body;

    //chk if our db has user with that email
    const user = await User.findOne({ email }).exec();
    if (!user) return res.status(400).send("User not found!");

    //chk password
    const match = await comparePassword(password, user.password);
    if (!match) return res.status(400).send("Wrong Password");

    //create signed jwt(jasonwebtoken)
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    //return user and token to client , exclude hashed password
    user.password = undefined;

    //send token in cookie
    res.cookie("token", token, {
      httpOnly: true,
      //secure: true // only works on https
    });
    // send user as json response
    res.json(user);
  } catch (err) {
    console.log(err);
    return res.status(400).send("Error! Try Again.");
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie("token");
    return res.json({ message: "SignedOut Successfully" });
  } catch (err) {
    console.log(err);
  }
};

export const currentUser = async (req, res) => {
  try {
    const user = await User.findById(req.auth._id).select("-password").exec(); //.id or ._id ya .__id (he has used req.user._id)
    console.log("CURRENT USER", user);
    return res.json({ ok: true });
  } catch (err) {
    console.log(err);
  }
};

export const sendTestEmail = async (req, res) => {
  //console.log("Send email using SES");
  //res.json({ ok: true });
  const params = {
    Source: process.env.EMAIL_FROM,
    Destination: {
      ToAddresses: ["uma120613@gmail.com"],
    },
    ReplyToAddresses: [process.env.EMAIL_FROM],
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `
            <html>
              <h1>Reset password link.</h1>
              <p>Please use the following link to reset your password.</p>
            </html>
          `,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: "Password Reset Link.",
      },
    },
  };

  const emailSent = SES.sendEmail(params).promise();

  emailSent.then((data) => {
    console.log(data);
    res.json({ ok: true }).catch((err) => {
      console.log(err);
    });
  });
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    // console.log(email);
    const shortCode = nanoid(6).toUpperCase();
    const user = await User.findOneAndUpdate(
      { email },
      { passwordResetCode: shortCode }
    );
    if (!user) return res.status(400).send("User not found");

    //prepare for email
    const params = {
      Source: process.env.EMAIL_FROM,
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: `
              <html>
              <h1>Reset Password</h1>
              <p>Use this code to reset your password.</p>
              <h2 style="color:red">${shortCode}</h2>
              <i>Vlabs.com</i>
              </html>
            `,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: "Reset Password",
        },
      },
    };
    const emailSent = SES.sendEmail(params).promise();
    emailSent
      .then((data) => {
        console.log(data);
        res.json({ ok: true });
      })
      .catch((err) => {
        console.log(err);
      });
  } catch (err) {
    console.log(err);
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    //console.table({ email, code, newPassword });
    const hashedPasssword = await hashPasssword(newPassword);

    const user = User.findOneAndUpdate(
      { email, passwordResetCode: code },
      { password: hashedPasssword, passwordResetCode: "" }
    ).exec();
    res.json({ ok: true });
  } catch (err) {
    console.log(err);
    return res.status(400).send("Error! Try again.");
  }
};
