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
    

    /**
    Define entities structure, this represents the supplementary data to be passed to authorization engine as part of every authorization query
    Entities list include information about users, groups, actions and relationships between these entities, this data is used to guide authorization engine
    This is the initial list of hard-coded entities, in real-world scenarios, these entities will be combination of backend data from database, runtime data
    from application context of environment in addition to user/groups data from user's security token.
    */
    let entities = {
                      entityList : []
                    };
    /**
    Extract and verify authorization token, this also parses the token data payload
    */
    const token = event.headers["Authorization"];
    let payload;
    try {
        payload = await jwtVerifier.verify(token);
        var groups = payload["cognito:groups"] || [];
        
        //add user (principal information) to entities list
        var userEntity =  {
            "identifier": {
              "entityType": "MyApplication::User",
              // "entityId": payload["cognito:username"]
              "entityId": payload["cognito:username"] || payload["username"]
            },
            "attributes": {
              "employmentStoreCode" : {
                "string":payload["custom:employmentStoreCode"] == null ? "":payload["custom:employmentStoreCode"] 
              }
            },
            "parents": []
          }
        
        groups.forEach((group) => {
          entities.entityList.push(
            {
              "identifier": {
                "entityType": "MyApplication::Group",
                "entityId": group
              }
            }
          );
          userEntity.parents.push (
            {
                "entityType": "MyApplication::Group",
                "entityId": group
            }
          );
        });
        entities.entityList.push(userEntity);
    } catch(err) {
        console.log(err)
        return buildResponse(403, "Error while verifying token: "+err);
    }
    
    //---------Prepare authorization query
    try{
       addResourceEntities(entities, actionMap[event.httpMethod + event.resource], event.pathParameters);
       
        let authQuery = {
            policyStoreId, 
            principal: {"entityType": "MyApplication::User", "entityId": payload["cognito:username"]},
            action: {"actionType": "MyApplication::Action", "actionId": actionMap[event.httpMethod + event.resource]},
            resource: buildResource(actionMap[event.httpMethod + event.resource], event.pathParameters), 
            entities
        };
        
        console.log(authQuery);
        
        const authResult = await avp.isAuthorized(authQuery).promise();
        console.log(authResult);
        
        if (authResult.decision == 'ALLOW') { //action is allowed by AVP
            return buildResponse(200, 'Successful backend response for ' + event.httpMethod + ' ' + event.path, authResult);
        } else { //action is denied by AVP
            return buildResponse(403, "You are not authorized to perform this action. " + event.httpMethod + ' ' + event.path, authResult);
        }
    }catch(err){
        console.log(JSON.stringify(err));
        return buildResponse(403, "Error while running authorization query: "+err, {});
    }

};

function addResourceEntities(entities, action, pathParams) {
  
  
  if( ["UpdatePet", "DeletePet"].contains(action) ){ //pet related action
  
    entities.entityList.push ({
      "identifier": {
        "entityType": "MyApplication::Pet", 
        "entityId": pathParams.petId
      },
      "attributes": {
            "storeId": {
              "string": pathParams.storeId
            }
      }
    });
  } else if( ["GetOrder", "CancelOrder"].contains(action) ){ //order related action
    entities.entityList.push ({
        "identifier": {
            "entityType": "MyApplication::Order", 
            "entityId": pathParams.orderNumber
        },
        "attributes": {
            "storeId": {
              "string": pathParams.storeId
            },
            "owner" : { // Hardcoding the owner to abhi, this is for demonestration purposes
                "entityIdentifier": {
                       "entityType": "MyApplication::User",
                       "entityId": "abhi"
                }                     
            }
      }
    });
  } else //application related action
    entities.entityList.push ({ 
      "identifier": {
        "entityType": "MyApplication::Application",
        "entityId": "PetStore"
      },
      "attributes": {
            "storeId": {
              "string": pathParams.storeId
            }
      }
    });  
}
//---------helper function to get resource mapping for an action
function buildResource(action, pathParams){
  
  if( ["UpdatePet", "DeletePet"].contains(action) ){ //pet related action
    return {
      "entityType": "MyApplication::Pet", 
      "entityId": pathParams.petId
      
    };
  }
  else if( ["GetOrder", "CancelOrder"].contains(action) ){ //order related action
    return {
        "entityType": "MyApplication::Order", 
        "entityId": pathParams.orderNumber
    };
  } else //application related action
    return {"entityType": "MyApplication::Application", "entityId": "PetStore"};
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
  "GET/store/{storeId}/pets": "SearchPets",
  "POST/store/{storeId}/pet/create": "AddPet",
  "POST/store/{storeId}/order/create": "PlaceOrder",
  "POST/store/{storeId}/pet/update/{petId}": "UpdatePet",
  "GET/store/{storeId}/order/get/{orderNumber}": "GetOrder",
  "POST/store/{storeId}/order/cancel/{orderNumber}": "CancelOrder",
  "GET/store/{storeId}/orders": "ListOrders",
  "GET/store/{storeId}/inventory": "GetStoreInventory"
}
