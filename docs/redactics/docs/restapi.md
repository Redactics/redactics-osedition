---
sidebar_position: 9
---

# REST API

Any aspect of your workflow configurations can be maintained via the Redactics REST API.

The easiest way to do this is simply fetch the workflow (which will return a JSON object), make your modifications, and then send back the modified payload as a PUT request, maintaining the JSON data structure. More comprehensive documentation providing a full dictionary of fields and their meaning will be provided in the future. For the free edition the hostname is https://api.redactics.com. The hostname for the API in the open source edition will be the Kubernetes service DNS name, only accessible on that cluster providing your cluster permits this network communication. Here are the supported endpoints:

## Free Edition Only

- POST `/users/login` (fields: `email`, `password`): this will return a JWT token saved as a cookie that will be used to authenticate subsequent requests. Support for passing in a token in a header may be added at a future date.

## All Editions

- GET `/workflow`: fetch configurations for all workflows
- POST `/workflow`: create a workflow based on your provided configuration
- GET `/workflow/[workflow UUID]`: fetch configuration for a specific workflow
- PUT `/workflow/[workflow UUID]`: update configuration for a specific workflow
- GET `/agent`: fetch configurations for all provisioned agents
- POST `/agent`: create a Redactics Agent
- PUT `/agent/[agent UUID]`: update configuration for a specific agent
