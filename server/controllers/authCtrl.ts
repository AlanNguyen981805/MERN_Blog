import jwt from 'jsonwebtoken';
import { generateActiveToken } from './../config/generateToken';
import { Request, Response } from "express";
import Users from "../models/userModel";
import bcrypt from "bcrypt"
import sendEmail from '../config/sendMail';
import { validateEmail, validatePhone } from '../middleware/valid';
import { sendSms } from '../config/sendSMS';
import { IDecodeToken } from '../config/interface';

const CLIENT_URL = `${process.env.BASE_URL}`

const authCtrl = {
    register: async(req: Request, res: Response) => {
        try {
            const { name, account, password } = req.body;

            const user = await Users.findOne({account})
            if(user) return res.status(400).json({msg: 'Email hoặc số điện thoại đã tồn tại'})
            const passwordHash = await bcrypt.hash(password, 12)

            const newUser = { name, account, password: passwordHash }

            const active_token = generateActiveToken({newUser})
            const url = `${CLIENT_URL}/active/${active_token}`

            if(validateEmail(account)) {
                sendEmail(account, url, 'Verify your email address')
                return res.json({msg: "Success! Please check your email"})
            } else if(validatePhone(account)) {
                sendSms(account, url, "Veryfi phone number")
                return res.json({msg: "Success! please check your phone "})
            }

            res.json({
                status: "OK", 
                msg: "Dang ky thanh cong", 
                data: newUser,
                active_token
            })
             
        } catch (err: any) {
            console.log(err)
            return res.status(500).json({msg: err.message})
        }
    },

    activeAccount: async(req: Request, res: Response) => {
        try {
            const { active_token } = req.body;

            const decoded = <IDecodeToken>jwt.verify(active_token, `${process.env.ACTIVE_TOKEN_SECRET}`)
            const {newUser} = decoded
            if(!newUser) return res.status(400).json({ msg: "Invalid authentication" })
            const user = new Users(newUser)

            await user.save()

            res.json({msg: "Tài khoản đã được kích hoạt"})

        } catch (err: any) {
            console.log(err);
            let errMsg;
            if(err.code === 11000) {
                errMsg = Object.keys(err.keyValue)[0] + " đã tồn tại"
            } else {
                console.log(err)
            }
            return res.status(500).json({msg: errMsg})
        }
    },
}

export default authCtrl