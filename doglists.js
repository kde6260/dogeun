const express = require('express');
const router = express.Router();
const pool = require('../model/db_pool');
const multer = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
try {
    aws.config.loadFromPath('./config/aws_config.json');
} catch (err) { console.log('aa'); }
const Parcels = require('../model/parcels');
const s3 = new aws.S3();
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'yeonsudogndogn',
        acl: 'public-read',
        key: function (req, file, cb) {
            cb(null, Date.now().toString() + '.' + file.originalname.split('.').pop());
        }
    })
});

const easyimg = require('easyimage');
const fs = require('fs');

// client로부터 받은 파일 업로드
const arrUpload = upload.fields([{ name: 'pet', maxCount: 3 }, { name: 'lineage', maxCount: 1 }, { name: 'parent', maxCount: 2 }
]);

router.post('/', arrUpload, addParcels);
router.put('/', arrUpload, changeParcels);
router.delete('/:parcel_id', removeParcels);

function showReq(req, res, next) {
    console.log(req.headers);
    next();
}


async function deleteInS3(itemKey) {
    return new Promise((resolve, reject) => {
       
        const params = {
            Bucket: 'yeonsudogndogn',
            //Key : itemKey
            Delete: {
                Objects: [
                    { 
                        Key: itemKey 
                    }
                ]
            }

        }

        s3.deleteObjects(params, (err, data) => {
            if (err) {
                reject(err);
            } else {
                console.log(data);
                resolve(data);
            }
        });
    })
};


// 만든 파일을 s3에 업로드하기위해, 업로드 후 썸네일 삭제
async function uploadToS3(itemKey, path) {
    return new Promise((resolve, reject) => {

        const params = {
            Bucket: 'yeonsudogndogn',
            Key: itemKey,
            ACL: 'public-read',
            Body: fs.createReadStream(path)
        }

        s3.putObject(params, (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                const imageUrl = s3.endpoint.href + params.Bucket + path;
                fs.unlinkSync(path);
                resolve(imageUrl);

            }
        })
    })
}


// 분양글 삭제, s3 이미지까지 삭제
async function removeParcels(req, res, next) {

    let remove_id = req.params.parcel_id;

    try {
        // s3 이미지 지우기
        let whatIs = 'pet';
        let pets = await Parcels.searchImage(remove_id,whatIs);
        var petKey = [];

        for (let petItem of pets) {
            petKey = petItem.image.split('/');
            await deleteInS3(petKey[3]);
        }
        
        whatIs = 'parent';
        let parents = await Parcels.searchImage(remove_id,whatIs);
        var parentKey = [];

        for(let parentItem of parents){
            parentKey = parentItem.image.split('/');
            await deleteInS3(parentKey[3]);
        }

        whatIs = 'parcel';
        let parcels = await Parcels.searchImage(remove_id,whatIs);
        var thumbnailKey = [];
        
        thumbnailKey = parcels[0].pet_thumbnail.split('/');
        await deleteInS3(thumbnailKey[4]);

        var lineageKey = [];

        lineageKey = parcels[0].lineage.split('/');
        await deleteInS3(lineageKey[3]);
        
        let result = Parcels.deleteParcles(remove_id);
       
        res.status(200).send({ message: 'save' });
    } catch (err) {
        console.log('err message : ', err);
        res.status(500).send({ message: 'fail' });
    }
};




async function changeParcels(req, res, next) {
    let change_id = req.body.parcel_id;

    let parcel_records = req.body;

    parcel_records.lineage = req.files['lineage'][0].location;
    console.log(parcel_records);

    let parent_image_records = [];

    console.log(req.files['parent']);
    for (let i in req.files['parent']) {
        parent_image_records.push({
            'image': req.files['parent'][i].location
            
        });
    }



    console.log(parent_image_records);
    //pet_images 테이블에 들어갈 record 배열 
    let image_records = [];

    // pet 이미지 파일 개수만큼 record 추가 , key값과 함께 배열에 push
    for (let i in req.files['pet']) {
        image_records.push({
            'image': req.files['pet'][i].location,
            'image_id': req.body.image_id
        });
    }


    try {
        let result = await Parcels.updateParcels(change_id, parcel_records, parent_image_records, image_records);
        res.send({ message: 'save' });
    } catch (err) {
        console.log('error message: ', err);
        res.send({ message: 'fail' });
    }
};



async function addParcels(req, res, next) {

    //error 처리
    if (!req.body.user_id || !req.body.spiece || !req.body.gender || !req.body.age || !req.body.region1
        || !req.body.region2 || !req.body.price || !req.body.size || !req.body.introduction
        || !req.body.condition || !req.body.title) {

        res.status(400).send({ message: 'fail' });
        return;
    }
    
    //파일 제외하고 body부분 record
    let parcel_records = req.body;

    //parcel 테이블에 들어갈 파일 record 추가
    if(!req.files['lineage']){
        parcel_records.lineage = null;
    }else{
    parcel_records.lineage = req.files['lineage'][0].location;
    }

    // parent_image_records 테이블에 들어갈 record 추가
    let parent_image_records = [];

    if (req.files['parent'] instanceof Array) {

        // parent 이미지 파일 개수만큼 record 추가 , key값과 함께 배열에 push
        for (let i in req.files['parent']) {
            parent_image_records.push({ 'image': req.files['parent'][i].location });
        }
    } else if(req.files['parent'])
    {
        parent_image_records.push({ 'image': req.files['parent'][0].location });
    }


    //pet_images 테이블에 들어갈 record 배열 
    let image_records = [];


    if (req.files['pet'] instanceof Array) {

        // pet 이미지 파일 개수만큼 record 추가 , key값과 함께 배열에 push
        for (let i in req.files['pet']) {
            image_records.push({ 'image': req.files['pet'][i].location });
        }

    } else {
        image_records.push({ 'image': req.files['pet'][0].location });
    }
    
  
    // 썸네일 만드는 부분 
    let thumnail_fileName = 'thumnbnail_' + req.files['pet'][0].key;

    let thumbnailPath = 'thumbnail/' + thumnail_fileName;

    let thumbnail = await easyimg.rescrop({
        name: thumnail_fileName,
        src: req.files['pet'][0].location,
        dst: thumbnailPath,
        width: 300, height: 400
    });

    let pet_thumbnail = await uploadToS3(thumnail_fileName, thumbnailPath);

    // 썸네일도 레코드에 추가
    parcel_records.pet_thumbnail = pet_thumbnail;

    // 함수 호출부분 
    // record 넘기고 클라이언트에 응답

    try {
     
        let ret = await Parcels.postParcels(parcel_records, parent_image_records, image_records);
        res.send({ message: 'save' });
    }
    catch (err) {
        console.log('error message : ', err);
        res.status(500).send({ message: 'fail' });

    }
};


module.exports = router;


/**
 * @api {get} /user/:id Request User information
 * @apiName GetUser
 * @apiGroup User
 *
 * @apiParam {Number} id Users unique ID.
 *
 * @apiSuccess {String} firstname Firstname of the User.
 * @apiSuccess {String} lastname  Lastname of the User.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "firstname": "John",
 *       "lastname": "Doe"
 *     }
 *
 * @apiError UserNotFound The id of the User was not found.
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "UserNotFound"
 *     }
 */