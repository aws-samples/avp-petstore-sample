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

let isAlertVisible, setIsAlertVisible, alertHeading, alertMessage , alertVariation;
let petId, orderNumber, authResult;

function App({ signOut, user }) {
  [isAlertVisible, setIsAlertVisible] = useState(false);
  
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
            
            <Tabs defaultIndex={1} >
              <TabItem title="Authorization model">Tab 1 Content</TabItem>
              <TabItem title="Action simulation">
                <Grid templateColumns="1fr 1fr">
                  <View textAlign="left">
                    
                    <Expander type="multiple" defaultValue={['line-01','line-02','line-03','line-04','line-05','line-06','line-07','line-08']}>
  
                      <Divider orientation="horizontal" />
                      <ExpanderItem title="Authenticated user actions" value="line-1">
                        <Text textAlign="left" variation="info">Listing all pets is an action permitted to all authenticated users regardless of their type.</Text><br/>
                        <Button onClick={() => getData('/pets', 'GET')}>Search Pets</Button>
                        <Button onClick={() => getData('/pet/create', 'POST')}>Add Pet</Button>
                        <Button onClick={() => getData('/order/create', 'POST')}>Place Order</Button>
                      </ExpanderItem>
                      
                      <Divider orientation="horizontal" />
                      <ExpanderItem title="Resource owner actions" value="line-2">
                        <Text textAlign="left" variation="info">Listing all pets is an action permitted to all authenticated users regardless of their type.</Text><br/>
                        <TextField onChange={e => petId = e.target.value} placeholder="Pet ID, 123 for example" label="Edit pet details" outerStartComponent={<Button onClick={(e) => getData('/pet/update/'+petId, 'POST')}>Submit</Button>}/><br/>
                        <TextField onChange={e => orderNumber = e.target.value}  placeholder="Order Number, 123 for example" label="Get order details" outerStartComponent={<Button onClick={() => getData('/order/get/'+orderNumber, 'GET')}>Submit</Button>}/><br/>
                        <TextField onChange={e => orderNumber = e.target.value}  placeholder="Order Number, 123 for example" label="Cancel order" outerStartComponent={<Button onClick={() => getData('/order/cancel/'+orderNumber, 'POST')}>Submit</Button>}/>
                      </ExpanderItem>
                      
                      <Divider orientation="horizontal" />
                      <ExpanderItem title="Store owner actions" value="line-3">
                        <Text textAlign="left" variation="info">Listing all pets is an action permitted to all authenticated users regardless of their type.</Text><br/>
                        <Button onClick={() => getData('/orders', 'GET')}>List All Orders</Button>
                        <Button onClick={() => getData('/inventory', 'GET')}>Get Inventory</Button>
                      </ExpanderItem>
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
  const path = actionPath;
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