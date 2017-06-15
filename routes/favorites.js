const express = require('express');
const router = express.Router();
const aws = require('../config/AWS');
aws.loadAccess();
const Favorites = require('../model/favorites');


router.get('/:user_id', async(req, res) => {
    // let token = req.headers.token;
    // if(!token) res.status(401).send({message: 'unauthorized'}); //토큰이 아예 없으면
    // else {
    //     let isRight = jwt.verify(token, req.app.get('secret-key'));
    //     if(!isRight) res.status(400).send({message: 'wrong token'}); //잘못된 토큰이 날아오면
    //     else {
    //         let decoded = jwt.decode(token, {complete: true});
    //         let token_id = decoded.payload.user_id;
    //         console.log('payload: ', decoded.payload);
    //         console.log('user_id: ', token_id);
    try {
        let data = await Favorites.getFavorites(req.params.user_id);
        res.status(200).send(data);
    }
    catch(err){
        res.status(500).send({message: err});
    }

        // }
    // }
});

router.put('/', async(req, res) => {
    try {
        //분양글 id, 사용자 id는 바디에 넣어서
        let result = await Favorites.setFavorites(req.body.parcel_id, req.body.user_id);
        res.status(201).send({message: 'success'});
    }
    catch(err){
        res.status(500).send({message: err});
    }

});
module.exports = router;