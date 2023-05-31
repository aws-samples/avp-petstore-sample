import { Amplify, API, Auth } from 'aws-amplify';

import { withAuthenticator,
  Expander, 
  ExpanderItem,
  Button,  
  Heading,
  Link,
  Flex,
  View,
  Text, 
  Divider,Tabs, TabItem, Alert, TextField, Grid,TextAreaField,
  useTheme} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { useState } from 'react';

import awsExports from './aws-exports';
Amplify.configure(awsExports);

let isAlertVisible, setIsAlertVisible, alertHeading, alertMessage , alertVariation, isCustomerUser;
let petId, orderNumber, authResult ='', storeId;

function App({ signOut, user }) {
  [isAlertVisible, setIsAlertVisible] = useState(false);
  var roles = user.signInUserSession.idToken.payload ['cognito:groups'] || [];
  return (
      <>
      <View as="header" padding="10px" backgroundColor="var(--amplify-colors-white)">
        <Flex direction="row" justifyContent="space-around" alignItems="center">
          <Flex>
              <Link>Home</Link>
              <Link>About</Link>
              <Link>Shop</Link>
          </Flex>
          <Heading level={4} textAlign="center">
            Welcome to PetStore
          </Heading>
          <Heading level={6} textAlign="center">
            Hello {user.username}
            <Button variation="link" onClick={signOut}>Sign out</Button>
          </Heading>
        </Flex>
      </View>

      <View as="div" minHeight="100px">
        <Flex direction="row" justifyContent="space-around" alignItems="center">
          <Flex width="7%"></Flex>
          <Flex width="86%" direction="column" padding="10px">
            {isAlertVisible ? (
              <Alert variation={alertVariation} isDismissible={true} heading={alertHeading}>{alertMessage}</Alert>
            ) : null}
          </Flex>
          <Flex width="7%"></Flex>
        </Flex>
      </View>
      
      <View as="div" padding="10px">

        <Flex direction="row" justifyContent="space-around" alignItems="center">
          <Flex width="7%"></Flex>
          <View padding="10px" as="div" level={1} textAlign="center" backgroundColor="var(--amplify-colors-white)" 
            width="86%" minHeight="300px" boxShadow="3px 3px 5px 6px var(--amplify-colors-neutral-60)" opacity="90">
            
            <Tabs defaultIndex={0} >
              <TabItem title="Action simulation">
                <Grid templateColumns="1fr 1fr">
                  <View textAlign="left">
                  
                    <TextField padding="10px" onChange={e => storeId = e.target.value} placeholder="PetStore Id eg. petstore-london" label="Enter PetStore Identifier" /><br/>
                        
                    <Expander type="multiple" defaultValue={['line-01','line-02','line-03','line-04','line-05','line-06','line-07','line-08']}>
  
                      <Divider orientation="horizontal" />
                      
                       
                      { roles.includes('Customer') ? (
                      <div>
                        <ExpanderItem title="Customer role type actions" value="line-1">
                          <Text textAlign="left" variation="info">Customers can search for pets, order pets and cancel orders. </Text><br/>
                          <Button onClick={() => getData('/pets', 'GET')}>Search Pets</Button>
                          <Button onClick={() => getData('/order/create', 'POST')}>Place Order</Button>
                          <Button onClick={() => getData('/order/get/order-1', 'GET')}>View Order</Button>
                        </ExpanderItem>
                      </div>
                      ): null}
                      
                     
                      {roles.includes('Pet-Groomer-Role') ? (
                      <div>
                        <TextField onChange={e => storeId = e.target.value} placeholder="PetStore Id eg. petstore-london" label="Enter PetStore Identifier" /><br/>
                        <Divider orientation="horizontal" />
                        <ExpanderItem title="Pet Groomer role actions" value="line-2">
                          <Text textAlign="left" variation="info">Pet Groomers can add pets, edit pet details and  get order details  .</Text><br/>
                          <Button onClick={() => getData('/pet/create', 'POST')}>Add Pet</Button>
                          <TextField onChange={e => petId = e.target.value} placeholder="Pet ID, 123 for example" label="Edit pet details" outerStartComponent={<Button onClick={(e) => getData('/pet/update/'+petId, 'POST')}>Submit</Button>}/><br/>
                          <TextField onChange={e => orderNumber = e.target.value}  placeholder="Order Number, 123 for example" label="Get order details" outerStartComponent={<Button onClick={() => getData('/order/get/'+orderNumber, 'GET')}>Submit</Button>}/><br/>
                      </ExpanderItem>
                      </div>
                      ) : null}
                      
                      {roles.includes('Store-Owner-Role') ? (
                      <div>
                        <Divider orientation="horizontal" />
                          <ExpanderItem title="Store Owner actions" value="line-3">
                            <Text textAlign="left" variation="info">Store Manager can get all orders and inventory of pets.</Text><br/>
                            <Button onClick={() => getData('/orders', 'GET')}>List All Orders</Button>
                          </ExpanderItem>
                      </div>
                      ): null}
                    </Expander>
                  </View>
                  
                  <View padding="10px" textAlign="left">
                    <TextAreaField isReadOnly={true} rows="20" size="small" 
                      label={
                        <Text fontWeight="bold" fontSize="medium">
                          Authorization query results:
                        </Text>
                    } value={authResult} /> 
                  </View>
                </Grid>
              </TabItem>
            </Tabs>
            
          </View>
          <Flex width="7%"></Flex>
        </Flex>
      </View>
      </>
  );
}

async function getData(actionPath, action) {

  authResult = "";
  setIsAlertVisible(false);
  const apiName = 'petstoreapi';
  const path = "/store/" + storeId + actionPath;
  const myInit = {
    headers:{
      Authorization: await getToken("ID")
    }
  };

  if(action == 'GET'){
    API.get(apiName, path, myInit).then(result => {  
      
      alertHeading = "Success!";
      alertVariation = "success";
      alertMessage = result.message;
      setIsAlertVisible(true);
      
      authResult = JSON.stringify(result, null, 2);
      
      return result.body;  
    }).catch(err => { 
      
      //console.log(err.response);
      
      alertHeading = err.response.statusText;
      alertVariation = "error";
      alertMessage = err.response.data.message;
      setIsAlertVisible(true);
      
      authResult = JSON.stringify(err.response.data, null, 2);
     
    });
  }

  else if(action == 'POST'){
    API.post(apiName, path, myInit).then(result => {  
      
      alertHeading = "Success!";
      alertVariation = "success";
      alertMessage = result.message;
      setIsAlertVisible(true);
      
      authResult = JSON.stringify(result, null, 2);
      
      return result.body;  
    }).catch(err => {  
      
      alertHeading = err.response.statusText;
      alertVariation = "error";
      alertMessage = err.response.data.message;
      setIsAlertVisible(true);
      
      authResult = JSON.stringify(err.response.data, null, 2);
      
    });
  }
}

async function getToken(type){
  if("ID" == type)
    return await (Auth.currentSession()).then(data => {return data.getIdToken().getJwtToken()})
  else if("ACCESS" == type)
    return await (Auth.currentSession()).then(data => {return data.getAccessToken().getJwtToken()})
}

export default withAuthenticator(App, 
  { hideSignUp: true , signUpAttributes: ["name"]}
);