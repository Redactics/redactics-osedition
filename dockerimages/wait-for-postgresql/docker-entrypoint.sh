#!/bin/sh -e

wait_for_postgresql(){
  postgresql_host=`echo $1 | cut -d '/' -f 3 | cut -d '@' -f 2`
  wait_for_service $postgresql_host '5432'
}

wait_for_service(){
  SERVICE=`echo $1 | grep ':' || echo $1:$2 `
  until nc -vz $SERVICE > /dev/null; do
    >&2 echo "$SERVICE is unavailable - sleeping"
    sleep 2
  done
  >&2 echo "$SERVICE is up"
}

wait_for(){
  # var should follow the follwing structure "$service_name:$service_url_env_var_name"
  # for instance postgresql:POSTGRESQL_URL

  for var in "$@"
  do
    service_name=`echo $var | cut -d ':' -f1`
    service_url=`echo $var | cut -d ':' -f2`
    if [ -z $service_url ]; then
      echo "skipping wait for $service_name due to missing configs"
    else
      case $service_name in
        postgresql) wait_for_postgresql $service_url ;;
      esac
    fi
  done
}

case $1 in
  wait_for)
    shift
    wait_for "$@"
  ;;

  *) exec "$@" ;;
esac

exit 0