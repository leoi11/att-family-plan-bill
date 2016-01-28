# Att Family Plan Bill
Scrape and calculate line charges of an AT&amp;T family plan 

## Installation
1. Install node.js: https://nodejs.org/en/
2. Install coffescript compiler globally: 

    ```shell
    npm install -g coffee-script
    ```

3. Install phantomjs: http://phantomjs.org/download.html
4. CD into the project directory
5. Install required modules for the server:

    ```shell
    npm install
    ```

6. Create config.json in the follwing format

    ```json
    {
      "user": "your_user_name",
      "password": "your_password",
      "passcode": "12345"
    }
    ```

## Scraping
1. Run 
```shell
phantomjs phatom.js
```
2. data.json will be output in the follwing format
```json
{
  "lines": {
    "line-1": {
      "charge-item-1": 12,
      "charge-item-2": 34,
      ...
    },
    "line-2": {
      ...
    },
    ...
  },
  "usages": {
    "line-1": 1.3,
    "line-2": 4.3,
    ...
  }
}
```

## Running the server
1. Run 

    ```shell
    coffee server.coffee
    ```

2. Go to http://localhost:3500/ for the report

### Routes

* GET /

    Route for the report, it will render a loading icon if data.json doesn't exist
    
* GET /data

    Return data.json in raw form

* POST /data

    Route for uploading data.json manually, use data.json as the request body
    
* GET /update

    Delete data.json in the directory and start the scraping script, redirect to /
    
## Known Issues
* Scraping script doesn't work on EC2 Ubuntu x64
