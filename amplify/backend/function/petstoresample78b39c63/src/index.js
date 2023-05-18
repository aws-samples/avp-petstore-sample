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
    let entities = {
                      "Entities" : [
                        {
                          "Identifier": {
                            "EntityType": "MyApplication::Action",
                            "EntityId": "AddPet"
                          }
                        },
                        {
                          "Identifier": {
                            "EntityType": "MyApplication::Action",
                            "EntityId": "SearchPets"
                          }
                        },
                        {
                          "Identifier": {
                            "EntityType": "MyApplication::Action",
                            "EntityId": "PlaceOrder"
                          }
                        },
                        {
                          "Identifier": {
                            "EntityType": "MyApplication::Action",
                            "EntityId": "UpdatePet"
                          }
                        },
                        {
                          "Identifier": {
                            "EntityType": "MyApplication::Action",
                            "EntityId": "DeletePet"
                          }
                        },
                        {
                          "Identifier": {
                            "EntityType": "MyApplication::Action",
                            "EntityId": "GetOrder"
                          }
                        },
                        {
                          "Identifier": {
                            "EntityType": "MyApplication::Action",
                            "EntityId": "CancelOrder"
                          }
                        },
                        {
                          "Identifier": {
                            "EntityType": "MyApplication::Action",
                            "EntityId": "ListOrders"
                          }
                        },
                        {
                          "Identifier": {
                            "EntityType": "MyApplication::Action",
                            "EntityId": "GetStoreInventory"
                          }
                        },
                        {
                          "Identifier": {
                            "EntityType": "MyApplication::Pet",
                            "EntityId": "123"
                          },
                          "Attributes": {
                            "owner": {
                              "EntityIdentifier": {
                                  "EntityType": "MyApplication::User",
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
                                  "EntityType": "MyApplication::User",
                                  "EntityId": "customer"
                              }
                            }
                          }
                        }
                      ]
                    };

    try {
        payload = await jwtVerifier.verify(token);
        var groups = payload["cognito:groups"] || [];
        console.log(groups);
        //add user to entities
        var userEntity =  {
            "Identifier": {
              "EntityType": "MyApplication::User",
              "EntityId": payload["cognito:username"]
            },
            "Attributes": {
              "storeOwner": {
                "Boolean": "true" == payload["custom:storeOwner"] ? true : false
              },
              "employmentStoreCode" : {
                "String":payload["custom:employmentStoreCode"] == null ? "":payload["custom:employmentStoreCode"] 
              }
            },
            "Parents": []
          }
        
        groups.forEach((group) => {
          entities.Entities.push(
            {
              "Identifier": {
                "EntityType": "MyApplication::Role",
                "EntityId": group
              }
            }
          );
          userEntity.Parents.push (
            {
                "EntityType": "MyApplication::Role",
                "EntityId": group
            }
          );
        });
        entities.Entities.push(userEntity);
    } catch(err) {
        console.log(err)
        return buildResponse(403, "Error while verifying token: "+err);
    }
    
    //---------Prepare authorization query
    try{
       addResourceEntities(entities, actionMap[event.httpMethod + event.resource], event.pathParameters);
       console.log (entities.Entities);
        let authQuery = {
            PolicyStoreIdentifier: policyStoreId, 
            Principal: {"EntityType": "MyApplication::User", "EntityId": payload["cognito:username"]},
            Action: {"ActionType": "MyApplication::Action", "ActionId": actionMap[event.httpMethod + event.resource]},
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

function addResourceEntities(entities, action, pathParams) {
  
  
  if( ["UpdatePet", "DeletePet"].contains(action) ){ //pet related action
  
    entities.Entities.push ({
      "Identifier": {
        "EntityType": "MyApplication::Pet", 
        "EntityId": pathParams.petId
      },
      "Attributes": {
            "storeId": {
              "String": pathParams.storeId
            }
      }
    });
  }
  else if( ["GetOrder", "CancelOrder"].contains(action) ){ //order related action
    entities.Entities.push ({
        "Identifier": {
            "EntityType": "MyApplication::Order", 
            "EntityId": pathParams.orderNumber
        },
        "Attributes": {
            "storeId": {
              "String": pathParams.storeId
            },
            "owner" : {                                     // Hardcoding the owner to abhi@
                "EntityIdentifier": {
                       "EntityType": "MyApplication::User",
                       "EntityId": "abhi"
                }                     
            }
      }
    });
  } else //application related action
    entities.Entities.push ({ 
      "Identifier": {
        "EntityType": "MyApplication::Application",
        "EntityId": "PetStore"
      },
      "Attributes": {
            "storeId": {
              "String": pathParams.storeId
            }
      }
    });  
}
//---------helper function to get resource mapping for an action
function buildResource(action, pathParams){
  
  if( ["UpdatePet", "DeletePet"].contains(action) ){ //pet related action
    return {
      "EntityType": "MyApplication::Pet", 
      "EntityId": pathParams.petId
      
    };
  }
  else if( ["GetOrder", "CancelOrder"].contains(action) ){ //order related action
    return {
        "EntityType": "MyApplication::Order", 
        "EntityId": pathParams.orderNumber
    };
  } else //application related action
    return {"EntityType": "MyApplication::Application", "EntityId": "PetStore"};
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
