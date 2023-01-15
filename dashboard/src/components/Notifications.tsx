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
} from '@material-ui/core';

import {
  Bell,
} from 'react-feather';

import {
  NotificationRecord,
} from '../types/redactics';

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
  notifications: NotificationRecord[];
  stackTrace: string;
  unreadCount: number;
  errorNotificationCheckbox: boolean;
  showException: boolean;
  showErrorNotification: boolean;
  pollingTrigger: boolean;
}

class Notifications extends React.Component<IProps, IState> {
  static contextType = RedacticsContext;

  constructor(props: IProps) {
    super(props);

    this.handleClick = this.handleClick.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.showException = this.showException.bind(this);
    this.hideDialog = this.hideDialog.bind(this);
    this.ackAll = this.ackAll.bind(this);
    this.toggleErrorNotification = this.toggleErrorNotification.bind(this);
    this.displayNotifications = this.displayNotifications.bind(this);
    this.getNotifs = this.getNotifs.bind(this);

    this.state = {
      anchorEl: null,
      notifications: [],
      stackTrace: '',
      unreadCount: 0,
      errorNotificationCheckbox: false,
      showException: false,
      showErrorNotification: false,
      pollingTrigger: false,
    };
  }

  componentDidMount() {
    this.getNotifs();
    this.startPolling();
  }

  startPolling() {
    setInterval(() => {
      if (!this.state.pollingTrigger) {
        this.getNotifs();
      }
    }, 10000);
  }

  async getNotifs() {
    try {
      this.setState({
        pollingTrigger: true
      });
      const response = await fetch(`${this.context.apiUrl}/notification`, {
        method: 'get',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const notifications = await response.json();
      const findUnreads = notifications.notifications.filter((notif:NotificationRecord) => {
        return (!notif.acked && notif.exception)
      })
  
      this.setState({
        notifications: notifications.notifications,
        unreadCount: findUnreads.length,
        pollingTrigger: false,
      });
    } catch (err) {
      // console.log('CATCH ERR', error);
    }
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

  showException(event:any, data:NotificationRecord) {
    event.preventDefault();

    let { unreadCount } = this.state;
    if (unreadCount > 0 && !data.acked) {
      unreadCount -= 1;
    }
    const notifications = this.state.notifications.map((notif:NotificationRecord) => {
      if (notif.uuid === data.uuid) {
        notif.acked = true;
      }
      return notif;
    })
    this.setState({
      showException: true,
      stackTrace: data.stackTrace || '',
      notifications,
      unreadCount,
    });
  }

  async hideDialog() {
    if (this.state.errorNotificationCheckbox) {
      // console.log('MARK ACK');
      try {
        await fetch(`${this.context.apiUrl}/users/ackErrorNotification`, {
          method: 'put',
          headers: {
            'Content-Type': 'application/json',
          },
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
      await fetch(`${this.context.apiUrl}/notification/ackAll`, {
        method: 'put',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const notifications = this.state.notifications.map((notif:NotificationRecord) => {
        notif.acked = true;
        return notif;
      });
      this.setState({
        notifications,
        unreadCount:0
      })
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
    const popoverContent = (this.state.notifications.length) ? (
      <Box>
        <Button color="primary" onClick={this.ackAll}>
          Mark All As Read
        </Button>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Message</TableCell>
              <TableCell>Workflow</TableCell>
              <TableCell>Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {this.state.notifications.map((n:NotificationRecord) => {
              // TODO: DRY, some sort of conditional wrapper
              const exceptionMsg = (n.exception && n.exception.length > 190) ? n.exception.substring(0,189) + "..." : n.exception;
              const exception = (n.acked) ? exceptionMsg : (<b>{exceptionMsg}</b>);

              let cell1 = null;
              let cell2 = null;
              let cell3 = null;
              if (n.firstHeartbeat) {
                cell1 = (
                  <TableCell component="th" scope="row">
                    The Redactics Agent <b>{n.agentName}</b> has successfully reported to Redactics
                  </TableCell>
                )
                cell2 = (
                  <TableCell>
                    N/A
                  </TableCell>
                )
                cell3 = (
                  <TableCell>
                    <Moment fromNow>{new Date(n.createdAt)}</Moment>
                  </TableCell>
                )

                return (
                  <ReadRow key={n.uuid}>{cell1}{cell2}{cell3}</ReadRow>
                )
              } else {
                cell1 = (
                  <TableCell component="th" scope="row">
                    <Link
                      href="#"
                      onClick={async (event:any) => {
                        if (n.stackTrace) {
                          this.showException(event, n);
                        }
                        try {
                          await fetch(`${this.context.apiUrl}/notification/${n.uuid}/ackException`, {
                            method: 'put',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                          });
                          this.setState({
                            anchorEl: null,
                          });
                        } catch (err) {
                          // console.log('ERR', err);
                        }
                      }}
                    >
                    {exception}
                    </Link>
                  </TableCell>
                )
                cell2 = (
                  <TableCell>
                    {n.workflowName || "N/A"}
                  </TableCell>
                )
                cell3 = (
                  <TableCell>
                    <Moment fromNow>{new Date(n.createdAt)}</Moment>
                  </TableCell>
                )

                return (n.acked) ? (
                  <ReadRow key={n.uuid}>{cell1}{cell2}{cell3}</ReadRow>
                ) : (
                  <TableRow key={n.uuid}>{cell1}{cell2}{cell3}</TableRow>
                );
              }
            })}
          </TableBody>
        </Table>
      </Box>
    ) : (
      <Box m={4}>
        You have no notifications
      </Box>);

    return popoverContent;
  }

  /* eslint-disable no-restricted-syntax */

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
      </React.Fragment>
    );
  }
}

export default Notifications;
