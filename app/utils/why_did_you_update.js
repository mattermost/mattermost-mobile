/* eslint-disable */

// Gist created by https://benchling.engineering/a-deep-dive-into-react-perf-debugging-fd2063f5a667

import _ from 'underscore';

function isRequiredUpdateObject(o) {
  return Array.isArray(o) || (o && o.constructor === Object.prototype.constructor);
}

function deepDiff(o1, o2, p) {
  const notify = (status) => {
    console.warn('Update %s', status);
    console.log('%cbefore', 'font-weight: bold', o1);
    console.log('%cafter ', 'font-weight: bold', o2);
  };
  if (!_.isEqual(o1, o2)) {
    console.group(p);
    if ([o1, o2].every(_.isFunction)) {
      notify('avoidable?');
    } else if (![o1, o2].every(isRequiredUpdateObject)) {
      notify('required.');
    } else {
      const keys = _.union(_.keys(o1), _.keys(o2));
      for (const key of keys) {
        deepDiff(o1[key], o2[key], key);
      }
    }
    console.groupEnd();
  } else if (o1 !== o2) {
    console.group(p);
    notify('avoidable!');
    if (_.isObject(o1) && _.isObject(o2)) {
      const keys = _.union(_.keys(o1), _.keys(o2));
      for (const key of keys) {
        deepDiff(o1[key], o2[key], key);
      }
    }
    console.groupEnd();
  }
}

function whyDidYouUpdate(theClass, prevProps, prevState) {
    deepDiff({props: prevProps, state: prevState},
             {props: theClass.props, state: theClass.state},
        theClass.constructor.name);
}

export default whyDidYouUpdate;
