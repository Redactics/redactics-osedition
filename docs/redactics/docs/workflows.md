---
sidebar_position: 3
---

# How the Workflows Work

## ERL (Extract, Redact, Load)

The Agent software that is installed into your own infrastructure carries out creating "safe" datasets that can be fed somewhere via its "Data Feeds" feature, and can generate data samples for a variety of use cases (including for development/testing). The "Digital Twin" data feed supports syncing data to a twin database via delta updates using a pure SQL-based approach.

When the workflow is executed (via its schedule or via the Redactics CLI), data for the specified time period and specified range of tables is extracted from the source. No source database modifications are required, and this extraction utilizes the native dumping technology provided by the database vendor (e.g. PostgreSQL's pgdump) meaning it is designed to work with tables of any size without having to worry about memory management - the footprint is minimal. The workflow defaults to 5 threads, meaning at any given time there will be 5 simultaneous table dumps occurring.

The extraction data is saved to a temporary disk used by the Redactics Agent. It is then injected into Redactics' internal database which is used for managing the delta updates and data privacy features. From there, if you've configured a data feed it will kick in to deliever the data wherever it needs to go. The Digital Twin data feed will ensure that data gets loaded directly into this target database.

Network access to these data sources is required, and the credentials to these databases are not passed on to the Redactics API. Your data likewise does not leave your infrastructure.

You can think of Redactics as a filter for your data, a filter that translates your data into safe data that can be shared to all of your stakeholders. This workflow is used for this very purpose.

## Database Migration Mocking

This workflow effectively clones your production database, with optional table exclusions. With this clone, you now have a database that is safe for doing a dry run of your database migrations. This workflow can be integrated with your CI/CD systems so that whenever you have a migration that you'd like to test with your actual production data, you can do so with a fully automated approach within your CI/CD platform.

A sample Helm hook and bash script are provided which do the work of the database cloning. With your Helm chart you can ensure that when you wish to do this migration dry-run this hook runs in advance of your normal migrations, and when your migrations run with a simple environment variable you can ensure that your migrations happen against your database clone rather than your primary database. Then, when your migration is successful, you can unset this option and run your migrations normally.

This workflow also uses the native dump/restore technology of your database vendor for its cloning. No database privacy protections are supported as a part of this workflow, so you'll need to ensure that your users do not have access to this database clone, and there is really no reason for anybody to require this access. Whatever systems you use for capturing logs can also be used with your migrations running against your database clone.