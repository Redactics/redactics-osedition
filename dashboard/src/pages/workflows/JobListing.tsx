import React from 'react';
import styled from 'styled-components';

import Helmet from 'react-helmet';
import Moment from 'react-moment';

import { red, green } from "@material-ui/core/colors";

import {
  Divider as MuiDivider,
  Grid as MuiGrid,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button as MuiButton,
  Box,
  Chip,
  Card as MuiCard,
  CardContent,
  CircularProgress,
  LinearProgress,
  Link,
} from '@material-ui/core';

import {
  Check as CheckIcon,
  ErrorOutline as ErrorOutlineIcon,
} from '@material-ui/icons';

import { spacing } from '@material-ui/system';
import {
  WorkflowJob,
} from '../../types/redactics';
import RedacticsContext from '../../contexts/RedacticsContext';

const Card = styled(MuiCard)(spacing);

const Divider = styled(MuiDivider)(spacing);

const Grid = styled(MuiGrid)(spacing);

const Button = styled(MuiButton)(spacing);

/* eslint-disable @typescript-eslint/no-empty-interface */

interface IProps {}

interface IState {
  // TODO: come up with WF Jobs typescript type
  jobs: any[];
  fbSubs: string[];
  stackTrace: string;
  showException: boolean;
  dataFetched: boolean;
}

class JobListing extends React.Component<IProps, IState> {
  static contextType = RedacticsContext;

  constructor(props: IProps) {
    super(props);

    this.state = {
      dataFetched: false,
      jobs: [],
      fbSubs: [],
      stackTrace: "",
      showException: false,
    };

    this.showException = this.showException.bind(this);
    this.hideDialog = this.hideDialog.bind(this);
  }

  componentDidMount() {
    this.refreshJobListing();

    // const jobs = ref(fbDatabase, `workflowJobProgress/${this.context.companyId}/triggerRefresh`);
    // onValue(jobs, (snapshot) => {
    //   const data = snapshot.val();
    //   if (!data) { return; }

    //   if (data.refresh) {
    //     this.refreshJobListing();
    //   }
    // });
  }

  showException(event:any, job:WorkflowJob) {
    event.preventDefault();

    this.setState({
      showException: true,
      stackTrace: job.stackTrace,
    })
  }

  hideDialog() {
    this.setState({
      showException: false,
    })
  }

  async refreshJobListing() {
    try {
      const response = await fetch(`${this.context.apiUrl}/database/jobs`, {
          credentials: 'include',
      });

      const data = await response.json();

      data.forEach((job:WorkflowJob) => {
        if (job.status === "inProgress" || job.status === "queued") {
          this.initFirebaseSubscription(job.uuid);
        }
      })

      this.setState({
        jobs: data,
        dataFetched: true,
      });
    } catch (err) {
    // console.log('CATCH ERR', error);
    }
  }

  initFirebaseSubscription(jobId:string) {
    // if (this.state.fbSubs.includes(jobId)) {
    //   // don't subscribe more than once
    //   return; 
    // }
    // const jobs = query(ref(fbDatabase, `workflowJobProgress/${this.context.companyId}/${jobId}`));
    // onValue(jobs, (snapshot) => {
    //   const data = snapshot.val();
    //   if (!data) { return; }

    //   // update state
    //   const wfJobs = this.state.jobs.map((j:WorkflowJob) => {
    //     const job = j;
        
    //     job.progress = (["inProgress", "queued"].includes(job.status) && job.uuid === data.uuid) ? data.progress : null;
        
    //     // update frontend values before next refresh
    //     if (job.progress === 100) {
    //       // transition from inProgress
    //       job.status = "completed";
    //     }
    //     else if (job.progress) {
    //       // transition from queued
    //       job.status = "inProgress";
    //     }

    //     return job;
    //   });
      
    //   const fbSubs = this.state.fbSubs;
    //   if (!fbSubs.includes(jobId)) { fbSubs.push(jobId); }

    //   this.setState({
    //     jobs: wfJobs,
    //     fbSubs: fbSubs,
    //   })
    // });
  }

  progressBar(job:WorkflowJob) {
    return (job.progress && job.progress < 100) ? (
      <Box mt={4}>
        <LinearProgress
          variant="determinate"
          value={job.progress}
        />
      </Box>
    ) : null;
  }

  statusIcon(job:WorkflowJob) {
    switch (job.status) {
      case 'inProgress':
      case 'queued':
        return (
          <CircularProgress />
        );

      case 'completed':
        return (
          <CheckIcon style={{ color: green[500], fontSize: 50 }} />
        )

      case 'error':
        return (
          <ErrorOutlineIcon style={{ color: red[500], fontSize: 50 }} />
        )

      default:
      break;
    }
  }

  workflowType(job:WorkflowJob) {
    switch (job.workflowType) {
      case 'ERL':
        return (
          <Typography variant="h5" gutterBottom>
            ERL (Extract, Redact, Load)
          </Typography>
        )

      case 'sampletable-athletes':
        return (
          <Typography variant="h5" gutterBottom>
            Install Sample Table: Athletes
          </Typography>
        )

      case 'sampletable-marketing_campaign':
        return (
          <Typography variant="h5" gutterBottom>
            Install Sample Table: Marketing Campaign
          </Typography>
        )

      case 'piiscanner':
        return (
          <Typography variant="h5" gutterBottom>
            PII Scanner
          </Typography>
        )

      case 'usersearch':
        return (
          <Typography variant="h5" gutterBottom>
            Forget User
          </Typography>
        )

      case 'mockDatabaseMigration':
        return (
          <Typography variant="h5" gutterBottom>
            Database Clone for Migration Dry-run
          </Typography>
        )

      default:
      break;
    } 
  }

  displayFile(url:string) {
    const urlArray = url.split('/');
    return urlArray[(urlArray.length - 1)];
  }

  workflowInfo(job:WorkflowJob) {
    return (job.databaseId) ? (
      <Box>
        Workflow: {job.workflowName} (<code>{job.databaseId}</code>)
      </Box>
    ) : null;
  }

  results(job:WorkflowJob) {
    let outputSummary:any = null;
    let outputInfo:any = null;
    if (job.status === "completed" && job.createdAt !== job.lastTaskEnd) {
      if (job.workflowType === "piiscanner") {
        outputInfo = (
          <span>
            Access the <Link href="/usecases/piiscanner" target="_blank">PII Scanner</Link> page to view the results of this scan.
          </span>
        )
      }
      else if (job.workflowType === "usersearch") {
        outputInfo = (
          <span>
            Access the generated SQL via the <code>download-export</code> Redactics CLI command, and the receipt of this SQL generation <Link href="/usecases/forgetuser" target="_blank">here</Link>.
          </span>
        )
      }
      outputSummary = job.outputLinks ? (
        <Box>
          <Box>
            <b>Completed in <Moment duration={job.createdAt} date={job.lastTaskEnd} /></b>. {job.outputSummary || outputInfo}
          </Box>
          <Box mt={2}>
            <ul>
              {job.outputLinks.map((u:string) => (
                <li><Link href={u} target="_blank">{this.displayFile(u)}</Link></li>
              ))}
            </ul>
          </Box>
        </Box>
      ) : (
        <Box>
          <b>Completed in <Moment duration={job.createdAt} date={job.lastTaskEnd} /></b>. {job.outputSummary || outputInfo}
        </Box>
      )
    }
    else if (job.status === "error") {
      const exceptionMsg = (job.exception && job.exception.length > 150) ? job.exception.substring(0,149) + "..." : job.exception;
      outputSummary = (
        <Box>
          <Link href="#" onClick={(event) => this.showException(event, job)}><b>{exceptionMsg}</b></Link>
        </Box>
      )
    }

    return (outputSummary) ? (
      <Box mt={4}>
        {outputSummary}
      </Box>
    ) : null;
  }

  initialCopies(job:WorkflowJob) {
    if (job.outputMetadata && job.outputMetadata.initialCopies && job.outputMetadata.initialCopies.length) {
      return (
        <Box mt={4}>
          <b>Full Copied Tables</b>

          <Box mt={4}>
            {job.outputMetadata.initialCopies.map((table:string) => {
              return (
                <Box display="inline" mr={1}>
                  <Chip
                    key={table}
                    label={table}
                    variant="outlined"
                    color="primary"
                    size="small"
                  />
                </Box>
              )
            })}
          </Box>
        </Box>
      )
    }
  }

  copySummary(job:WorkflowJob) {
    if (job.outputMetadata && job.outputMetadata.copySummary && job.outputMetadata.copySummary.length) {
      return (
        <Box mt={4}>
          <b>Copy Summary</b>

          <Box mt={4}>
            <ul>
              {job.outputMetadata.copySummary.map((summary:string) => {
                return (
                  <li>{summary}</li>
                )
              })}
            </ul>
          </Box>
        </Box>
      )
    }
  }

  deltaCopies(job:WorkflowJob) {
    if (job.outputMetadata && job.outputMetadata.deltaCopies && job.outputMetadata.deltaCopies.length) {
      return (
        <Box mt={4}>
          <b>Delta Copied Tables</b>
      
          <Box mt={4}>
            {job.outputMetadata.deltaCopies.map((table:string) => {
              return (
                <Box display="inline" mr={1}>
                  <Chip
                    key={table}
                    label={table}
                    variant="outlined"
                    color="primary"
                    size="small"
                  />
                </Box>
              )
            })}
          </Box>
        </Box>
      )
    }
  }

  render() {
    return (
      <React.Fragment>
        <Helmet title="Workflow Jobs" />

        <Typography variant="h1" gutterBottom display="inline">
          Workflow Jobs
        </Typography>

        <Divider my={6} />

        <Dialog
          open={this.state.showException}
          onClose={this.hideDialog}
          maxWidth="lg"
          aria-labelledby="dialog-title"
          aria-describedby="dialog-description"
        >
          <DialogTitle id="dialog-title">Error Stacktrace</DialogTitle>
          <DialogContent>
            <DialogContentText id="dialog-description">
              {
                this.state.stackTrace.split('\n').map((text:string, index:number) => <React.Fragment key={`${text}-${index}`}>
                    {text}
                    <br />
                  </React.Fragment>)
              }
            </DialogContentText>

            <DialogActions>
              <Button color="primary" onClick={this.hideDialog}>
                Close
              </Button>
            </DialogActions>
          </DialogContent>
        </Dialog>

        {this.state.jobs.map((job:WorkflowJob) => {
          return (
            <Box mb={4} key={job.uuid}>
              <Card>
                <CardContent>
                  <Grid
                    justify="space-between"
                    container
                    spacing={10}
                  >
                    <Grid item xs={1}>
                      {this.statusIcon(job)}
                    </Grid>

                    <Grid item xs={11}>
                      {this.workflowType(job)}
                      {this.workflowInfo(job)}
                      Created: <Moment fromNow>{new Date(job.createdAt)}</Moment>
                      {this.progressBar(job)}
                      {this.results(job)}
                      {this.deltaCopies(job)}
                      {this.initialCopies(job)}
                      {this.copySummary(job)}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Box>
          )
        })}

        {(this.state.dataFetched && (!this.state.jobs || !this.state.jobs.length)) ? (
          <Card mt={8}>
            <CardContent>
              You have no workflow jobs yet. Jobs will appear here after the time the job has been scheduled for, or when run manually. These not include jobs created in the "Workflows" section, but PII Scanner and Forget User jobs as well.
            </CardContent>
          </Card>
        ) : null}

      </React.Fragment>
    );
  }
}

export default JobListing;
