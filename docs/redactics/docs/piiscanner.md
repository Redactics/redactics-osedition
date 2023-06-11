---
sidebar_position: 4
---

# Automated PII Scanner

The Redactics CLI supports invoking a scan of Personally Identifiable Information (PII) in the databases attached to a workflow using HIPAA identifiers, which are listed in the Dashboard. Fields containing PII that are found based on these identifers are returned to the dashboard with the primary key of an example row containing this PII (the PII itself is, of course, not sent to Redactics), as well as a count of the number of occurences found.

With these results, you can then vet these findings, and findings that are deemed a legitimate concern can be added to your redaction ruleset for that workflow. For databases containing a lot of tables with a lot of fields containing PII this not only helps provide peace of mind in tracking down PII sources, but also saves a lot of time in automating generating the configurations required to manage the handling of this PII.

We are working on extending this feature to support automating detecting new sources of PII on an ongoing basis as schema changes.