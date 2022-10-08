const express=require('express');
const { check, validationResult } = require('express-validator');
const router=express.Router();
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const config=require('config');
const auth=require('../middleware/auth');

const Receptionist=require('../models/receptionist');

router.post(
    '/signup',
    check('name','name is required').not().isEmpty(),
    check('email','email is required').isEmail(),
    check('password','password is required').notEmpty(),
    check('age','age is required').notEmpty(),
    check('phone','phone is required').notEmpty(),
    check('address','address is required').notEmpty()
    ,
    async (req,res)=>{
        console.log(req.body);
        errors=validationResult(req);
        if(!errors.isEmpty()){
            return res.status(400).json({errors:errors.array()});
        }
        const {name,email,password,age,phone,address}=req.body;

        try{
            let receptionist=await Receptionist.findOne({email});
            if(receptionist){
                return res.status(400).json({error:[{msg:'User is already taken'}]});
            }

            receptionist=new Receptionist({name,email,password,age,phone,address});

            //encrypting password
            const salt=await bcrypt.genSalt(10);
            receptionist.password=await bcrypt.hash(password,salt);
            await receptionist.save();
            //return json web token
            const payload={
                user:{
                    id:receptionist.id
                }
            };
            jwt.sign(payload,config.get('jwttoken'),{expiresIn:3600},(err,token)=>{
                if(err)throw err;
                res.json({token});
            });
        }
        catch(err){
            console.log(err.message);
            res.status(500).send('Server Error');
        }
    }
);

router.get('/receptionist_id',auth,async (req,res)=>{
        try {
            const receptionist=await Receptionist.findById(req.user.id).select('-password');
            res.json(receptionist);
        } catch (err) {
            console.log(err.message);
        }
    }
);

router.post('/login',
    check('email','Email required').isEmail(),
    check('password','Password required').notEmpty(),
    async (req,res)=>{
        errors=validationResult(req);
        if(!errors.isEmpty()){
            return res.status(400).json({errors:errors.array()});
        }
        const {email,password}=req.body;
        try {
            let receptionist=await Receptionist.findOne({email});
            if(!receptionist){
                return res.status(400).json({error:[{msg:'Invalid credentials'}]});
            }
            
            const isMatch=await bcrypt.compare(password,receptionist.password);
            if(!isMatch)return res.status(400).json({error:[{msg:'Invalid credentials'}]});
            //return json web token
            const payload={
                user:{
                    id:receptionist.id
                }
            }
            jwt.sign(payload,config.get('jwttoken'),{expiresIn:3600},(err,token)=>{
                if(err)throw err;
                res.json({token});
            });
        } catch (err) {
            console.log(err.message);
        }
    })

router.delete('/:receptionist_id',auth,async (req,res)=>{
    try {
        await Receptionist.findOneAndRemove({id:req.params.receptionist_id});
        res.json({msg:'User removed'});
    } catch (err) {
        console.log(err.message);
    }
});

router.post('/update',
    auth,
    check('age','Age required').notEmpty(),
    async (req,res)=>{
        const errors=validationResult(req);
        if(!errors.isEmpty())return res.status(400).json({errors:errors.array()});
        const {name,age,phone,address}=req.body;
        try {
            // const receptionist=Receptionist.findById({id:req.params.receptionist_id});
            // if(!receptionist)return res.status(400).res({msg:'No User found'});

            const fields={};
            fields.name=name;
            fields.age=age;
            fields.phone=phone;
            fields.address=address;
            let receptionist=await Receptionist.findOneAndUpdate(
                {user:req.user.id},
                {$set:fields},
                {new: true}
            )

            return res.json({msg:'Update Complete'});
        } catch (error) {
            console.log(error.message);
        }
        
    })
module.exports=router;