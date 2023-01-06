import React from 'react';
import styled from 'styled-components';
import Moment from 'react-moment';

import {
  IconButton as MuiIconButton,
  Badge,
  Popover,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Link,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  FormControlLabel,
  Checkbox,
} from '@material-ui/core';

import {
  Bell,
} from 'react-feather';

import RedacticsContext from '../contexts/RedacticsContext';

const IconButton = styled(MuiIconButton)`
  svg {
    width: 22px;
    height: 22px;
  }
`;

const Indicator = styled(Badge)`
  .MuiBadge-badge {
    background: ${(props) => props.theme.header.indicator.background};
    color: ${(props) => props.theme.palette.common.white};
  }
`;

const ReadRow = styled(TableRow)`
  th, td {
    background-color: rgba(0, 0, 0, 0.025);
  }
`;

interface IProps {
  theme: any;
}

interface IState {
  anchorEl?: any;
  //firebaseData: AgentFirebaseRecord[];
  stackTrace: string;
  unreadCount: number;
  errorNotificationCheckbox: boolean;
  showException: boolean;
  showErrorNotification: boolean;
}

class Notifications extends React.Component<IProps, IState> {
  static contextType = RedacticsContext;

  constructor(props: IProps) {
    super(props);

    this.handleClick = this.handleClick.bind(this);
    this.handleClose = this.handleClose.bind(this);
    //this.showException = this.showException.bind(this);
    this.hideDialog = this.hideDialog.bind(this);
    this.ackAll = this.ackAll.bind(this);
    this.toggleErrorNotification = this.toggleErrorNotification.bind(this);
    this.displayNotifications = this.displayNotifications.bind(this);
    this.processFirebaseData = this.processFirebaseData.bind(this);

    this.state = {
      anchorEl: null,
      //firebaseData: [],
      stackTrace: '',
      unreadCount: 0,
      errorNotificationCheckbox: false,
      showException: false,
      showErrorNotification: false,
    };
  }

  componentDidMount() {
    this.processFirebaseData();
  }

  handleClick(event:any) {
    this.setState({
      anchorEl: event.currentTarget,
    });
  }

  handleClose() {
    this.setState({
      anchorEl: null,
    });
  }

  // showException(event:any, data:AgentFirebaseRecord) {
  //   event.preventDefault();

  //   let { unreadCount } = this.state;
  //   if (unreadCount > 0 && !data.ack && typeof data.ack !== 'undefined') {
  //     unreadCount -= 1;
  //   }
  //   this.setState({
  //     showException: true,
  //     stackTrace: data.stackTrace || '',
  //     unreadCount,
  //   });
  // }

  async hideDialog() {
    if (this.state.errorNotificationCheckbox) {
      // console.log('MARK ACK');
      try {
        await fetch(`${this.context.apiUrl}/users/ackErrorNotification`, {
          method: 'put',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        this.setState({
          showException: false,
          showErrorNotification: false,
          stackTrace: '',
        });
      } catch (err) {
        // console.log('ERR', err);
      }
    } else {
      this.setState({
        showException: false,
        showErrorNotification: false,
        stackTrace: '',
      });
    }
  }

  async ackAll() {
    try {
      this.setState({
        anchorEl: null,
      });
      fetch(`${this.context.apiUrl}/database/ackAll`, {
        method: 'put',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
    } catch (err) {
      // console.log('ERR', err);
    }
  }

  toggleErrorNotification(event:any) {
    this.setState({
      errorNotificationCheckbox: event.target.checked,
    });
  }

  displayNotifications() {
    // const popoverContent = (this.state.firebaseData.length) ? (
    //   <Box>
    //     <Button color="primary" onClick={this.ackAll}>
    //       Mark All As Read
    //     </Button>
    //     <Table>
    //       <TableHead>
    //         <TableRow>
    //           <TableCell>Message</TableCell>
    //           <TableCell>Database</TableCell>
    //           <TableCell>Date</TableCell>
    //         </TableRow>
    //       </TableHead>
    //       <TableBody>
    //         {this.state.firebaseData.map((v:AgentFirebaseRecord) => {
    //           // TODO: DRY, some sort of conditional wrapper
    //           const exceptionMsg = (v.exception && v.exception.length > 190) ? v.exception.substring(0,189) + "..." : v.exception;
    //           const exception = (v.ack) ? exceptionMsg : (<b>{exceptionMsg}</b>);

    //           if (v.firstHeartbeat) {
    //             return (
    //               <TableRow key={v.key}>
    //                 <TableCell component="th" scope="row">
    //                   The Redactics Agent <b>{v.agentName}</b> has successfully reported to Redactics
    //                 </TableCell>
    //                 <TableCell>

    //                 </TableCell>
    //                 <TableCell>
    //                   <Moment fromNow>{new Date(v.timestamp)}</Moment>
    //                 </TableCell>
    //               </TableRow>
    //             );
    //           } else {
    //             return (
    //               <ReadRow key={v.key}>
    //                 <TableCell component="th" scope="row">
    //                   <Link
    //                     href="#"
    //                     onClick={async (event:any) => {
    //                       if (v.stackTrace) {
    //                         //this.showException(event, v);
    //                       }
    //                       try {
    //                         await fetch(`${this.context.apiUrl}/database/${v.databaseId}/ackException`, {
    //                           method: 'put',
    //                           headers: {
    //                             'Content-Type': 'application/json',
    //                           },
    //                           credentials: 'include',
    //                           body: JSON.stringify({
    //                             exceptionId: v.key,
    //                           }),
    //                         });
    //                         this.setState({
    //                           anchorEl: null,
    //                         });
    //                       } catch (err) {
    //                         // console.log('ERR', err);
    //                       }
    //                     }}
    //                   >
    //                   {exception}
    //                   </Link>
    //                 </TableCell>
    //                 <TableCell>
    //                   {v.databaseName}
    //                 </TableCell>
    //                 <TableCell>
    //                   <Moment fromNow>{new Date(v.timestamp)}</Moment>
    //                 </TableCell>
    //               </ReadRow>
    //             );
    //           }
    //         })}
    //       </TableBody>
    //     </Table>
    //   </Box>
    // ) : (
    //   <Box m={4}>
    //     You have no notifications
    //   </Box>);

    // return popoverContent;
    return null;
  }

  /* eslint-disable no-restricted-syntax */

  processFirebaseData() {
    // let unreadCount = 0;
    // let exceptionsFound = 0;
    // let displayExceptions = 10; // display this many exceptions
    // const notifications = query(ref(fbDatabase, `notifications/${this.context.companyId}`), orderByChild('timestamp'));
    // onValue(notifications, (snapshot) => {
    //   const data = snapshot.val();
    //   if (!data) { return; }
    //   const formattedData = [];
    //   unreadCount = 0;
    //   exceptionsFound = 0;

    //   // show displayExceptions most recent exceptions
    //   let showErrorNotification = false;
    //   for (const [key, v] of Object.entries(data).reverse()) {
    //     // cast Firebase data to AgentFirebaseRecord type
    //     const val: AgentFirebaseRecord = v as AgentFirebaseRecord;
    //     if (!val.ack && typeof val.ack !== 'undefined' && val.exception) {
    //       unreadCount += 1;
    //     }

    //     //console.log("VAL", val)
    //     if (!val.heartbeat && exceptionsFound < displayExceptions) {
    //       // attach key to data
    //       val.key = key;
    //       exceptionsFound++;
    //       formattedData.push(val);
    //     }

    //     if (!val.ack && val.exception && !this.context.ackErrorNotification) {
    //       // trigger dialog about notification bell
    //       showErrorNotification = true;
    //     }
    //   }

    //   //console.log("UNREAD", unreadCount, formattedData.reverse())
    //   this.setState({
    //     showErrorNotification,
    //     errorNotificationCheckbox: false,
    //     firebaseData: formattedData,
    //     unreadCount,
    //   });
    // });
  }

  render() {
    const open = Boolean(this.state.anchorEl);
    const id = open ? 'simple-popover' : undefined;

    return (
      <React.Fragment>
        <IconButton color="inherit" onClick={this.handleClick}>
          <Indicator badgeContent={this.state.unreadCount}>
            <Bell />
          </Indicator>
        </IconButton>
        <Popover
          id={id}
          open={open}
          anchorEl={this.state.anchorEl}
          onClose={this.handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          {this.displayNotifications()}
        </Popover>
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

        <Dialog
          open={this.state.showErrorNotification}
          maxWidth="lg"
          aria-labelledby="dialog-title"
          aria-describedby="dialog-description"
        >
          <DialogTitle id="dialog-title">An Error Has Been Reported to Redactics</DialogTitle>
          <DialogContent>
            <DialogContentText id="dialog-description">
              Errors, including full stack traces, can be accessed via the
              notification bell in the upper right hand corner.

              <Box mt={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={this.state.errorNotificationCheckbox}
                      onChange={this.toggleErrorNotification}
                      name="helmReminder"
                      color="primary"
                    />
                  }
                  label="I got it, don't show this again"
                />
              </Box>
            </DialogContentText>

            <DialogActions>
              <Button color="primary" onClick={this.hideDialog}>
                Close
              </Button>
            </DialogActions>
          </DialogContent>
        </Dialog>
      </React.Fragment>
    );
  }
}

export default Notifications;
