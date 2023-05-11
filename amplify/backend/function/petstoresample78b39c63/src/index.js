const AWS = require('aws-sdk');
const avp = new AWS.Service({
  apiConfig: require('./verifiedpermissions.json')
});

const { CognitoJwtVerifier } = require("aws-jwt-verify");
const jwtVerifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USERPOOLID,
  tokenUse: "id",
  clientId: process.env.APPCLIENTID
});

const policyStoreId = process.env.POLICYSTOREID;

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);
    
    //---------Verify and decode authorization token
    const token = event.headers["Authorization"];
    let payload;
    try {
        payload = await jwtVerifier.verify(token);
        
        //add user to entities
        entities.Entities.push(
        {
          "Identifier": {
            "EntityType": "User",
            "EntityId": payload["cognito:username"]
          },
          "Attributes": {
            "storeOwner": {
              "Boolean": "true" == payload["custom:storeOwner"] ? true : false
            }
          }
        });
        
    } catch(err) {
        console.log(err)
        return buildResponse(403, "Error while verifying token: "+err);
    }
    
    //---------Prepare authorization query
    try{
        let authQuery = {
            PolicyStoreIdentifier: policyStoreId, 
            Principal: {"EntityType": "User", "EntityId": payload["cognito:username"]},
            Action: {"ActionType": "Action", "ActionId": actionMap[event.httpMethod + event.resource]},
            Resource: buildResource(actionMap[event.httpMethod + event.resource], event.pathParameters), 
            SliceComplement: entities
        };
        console.log(authQuery);
        const authResult = await avp.isAuthorized(authQuery).promise();
        console.log(authResult);
        
        if (authResult.Decision == 'Allow') { //action is allowed by AVP
            return buildResponse(200, 'Successful backend response for ' + event.httpMethod + ' ' + event.path, authResult);
        } else { //action is denied by AVP
            return buildResponse(403, "You are not authorized to perform this action. " + event.httpMethod + ' ' + event.path, authResult);
        }
    }catch(err){
        return buildResponse(403, "Error while running authorization query: "+err, {});
    }

};

//---------helper function to get resource mapping for an action
function buildResource(action, pathParams){
  
  if( ["UpdatePet", "DeletePet"].contains(action) ){ //pet related action
    return {"EntityType": "Pet", "EntityId": pathParams.petId};
  }
  else if( ["GetOrder", "CancelOrder"].contains(action) ){ //order related action
    return {"EntityType": "Order", "EntityId": pathParams.orderNumber};
  }else //application related action
    return {"EntityType": "Application", "EntityId": "PetStore"};
}

//---------helper function to build HTTP response
function buildResponse(code, message, authResult){
  authResult.message = message;
  let response =  {
      statusCode: code,
      headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Content-Type": "application/json"
      }, 
      body: JSON.stringify(authResult)
  };
  
  return response;
}

Array.prototype.contains = function(element){
    return this.indexOf(element) > -1;
};

//---------Map http method and resource path to an action defined in AuthZ model
const actionMap = {
  "GET/pets": "SearchPets",
  "POST/pet/create": "AddPet",
  "POST/order/create": "PlaceOrder",
  "POST/pet/update/{petId}": "UpdatePet",
  "GET/order/get/{orderNumber}": "GetOrder",
  "POST/order/cancel/{orderNumber}": "CancelOrder",
  "GET/orders": "ListOrders",
  "GET/inventory": "GetStoreInventory"
}

//---------Entities list
const entities = {
  "Entities" : [
    {
      "Identifier": {
        "EntityType": "Action",
        "EntityId": "AddPet"
      }
    },
    {
      "Identifier": {
        "EntityType": "Action",
        "EntityId": "SearchPets"
      }
    },
    {
      "Identifier": {
        "EntityType": "Action",
        "EntityId": "PlaceOrder"
      }
    },
    {
      "Identifier": {
        "EntityType": "Action",
        "EntityId": "UpdatePet"
      }
    },
    {
      "Identifier": {
        "EntityType": "Action",
        "EntityId": "DeletePet"
      }
    },
    {
      "Identifier": {
        "EntityType": "Action",
        "EntityId": "GetOrder"
      }
    },
    {
      "Identifier": {
        "EntityType": "Action",
        "EntityId": "CancelOrder"
      }
    },
    {
      "Identifier": {
        "EntityType": "Action",
        "EntityId": "ListOrders"
      }
    },
    {
      "Identifier": {
        "EntityType": "Action",
        "EntityId": "GetStoreInventory"
      }
    },
    {
      "Identifier": {
        "EntityType": "Pet",
        "EntityId": "123"
      },
      "Attributes": {
        "owner": {
          "EntityIdentifier": {
              "EntityType": "User",
              "EntityId": "customer"
          }
        }
      }
    },
    {
      "Identifier": {
        "EntityType": "Order",
        "EntityId": "123"
      },
      "Attributes": {
        "owner": {
          "EntityIdentifier": {
              "EntityType": "User",
              "EntityId": "customer"
          }
        }
      }
    }
  ]
};
