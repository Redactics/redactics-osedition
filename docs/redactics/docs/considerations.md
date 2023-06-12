---
sidebar_position: 6
---

# Data Considerations

## Requirements for Delta Table Updates

With the "Digital Twin" data feed option enabled (which maintains a clone of your data source minus PII/sensitive data), the Redactics Agent will auto-attempt delta updates when all of the requirements have been fulfilled:

1. Your table contains a numerical primary key (the Agent will find new data based on finding larger primary keys missing in the digital twin).
1. Your table contains an "updated at" timestamp (the Agent will detect updates based on update timestamps newer than the last workflow execution), and you've specified what this field is in your data feed's dashboard configuration.
1. The schema of both the source and digital twin table is identical.

Soft deletes (i.e. a field to track deletions) are recommended to record deletions in the digital twin, as the Agent will not scan the entire table to find missing rows.

With delta table updates working, workflow execution can be quicker and less disruptive in not having to truncate and recreate the table on each workflow execution, i.e. regeneration mode. Regeneration mode will be used for specific tables where the above requirements have not been met. If, for some reason, you do not wish to delta update specific tables (e.g. you are encountering problems or intentionally wish to hard reset your tables each time your workflow executes, perhaps to reset a demo environment), you can disable delta updates for your workflow or for specific tables within your workflow's configuration.

## PostgreSQL Foreign Key Constraints

The ERL workflow removes foreign key constraints both in its internal database, as well as your digital twin, if you have this Data Feed enabled. The reason for this is because the threads that generate data operate syncronously, meaning that the order in which data will be loaded will be unpredictable, and the ERL configurations also support table inclusions and exclusions. Both of these things mean that there is no way to guarantee that your foreign key data will be loaded in a specific order, and therefore foreign key constraint errors will occur. Each thread will automatically retry on failure, but it was decided that it would be better to remove these constraints than rely on retries and including all required data.

Support for enabling/disabling this feature might be added at a future date.

## Support for Custom Database Functions (Including UUIDs)

Redactics will automatically enable any extensions that are required by your data. If you load your functions into a separate schema, you can specify this schema which will be used for matching this behaviour in your target Digital Twin database.
