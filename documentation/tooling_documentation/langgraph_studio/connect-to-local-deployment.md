https://langchain-ai.github.io/langgraph/cloud/how-tos/test_local_deployment/

COPY-PASTE OF WEB PAGE:


Skip to content
logo
LangGraph Studio With Local Deployment


  
 GitHub
0.2.53
6.8k
1.1k
Home
Tutorials
How-to Guides
Conceptual Guides
Reference
Table of contents
Setup
Access Studio
Use the Studio for Testing
Home
How-to Guides
LangGraph Platform
LangGraph Studio
LangGraph Studio With Local Deployment¶

Browser Compatibility
Viewing the studio page of a local LangGraph deployment does not work in Safari. Use Chrome instead.

Setup¶

Make sure you have setup your app correctly, by creating a compiled graph, a .env file with any environment variables, and a langgraph.json config file that points to your environment file and compiled graph. See here for more detailed instructions.

After you have your app setup, head into the directory with your langgraph.json file and call langgraph up -c langgraph.json --watch to start the API server in watch mode which means it will restart on code changes, which is ideal for local testing. If the API server start correctly you should see logs that look something like this:


Ready!
- API: http://localhost:8123
2024-06-26 19:20:41,056:INFO:uvicorn.access 127.0.0.1:44138 - "GET /ok HTTP/1.1" 200
Read this reference to learn about all the options for starting the API server.

Access Studio¶

Once you have successfully started the API server, you can access the studio by going to the following URL: https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:8123 (see warning above if using Safari).

If everything is working correctly you should see the studio show up looking something like this (with your graph diagram on the left hand side):

LangGraph Studio

Use the Studio for Testing¶

To learn about how to use the studio for testing, read the LangGraph Studio how-tos.

Comments


 Back to top
Previous
Test Cloud Deployment
Next
Invoke Assistant
Made with Material for MkDocs Insiders
