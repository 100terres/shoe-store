import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { appSetBreadcrumb } from '../state/appActions';

const injectBreadcrumb = breadcrumb => WrappedComponent => {
  class InjectBreadcrumb extends Component {
    componentDidMount() {
      const { setBreadcrumb } = this.props;

      setBreadcrumb();
    }

    render() {
      const { setBreadcrumb, ...rest } = this.props;

      return <WrappedComponent {...rest} />;
    }
  }

  InjectBreadcrumb.propTypes = {
    setBreadcrumb: PropTypes.func.isRequired,
  };

  const mapDispatch = (dispatch, ownProps) => ({
    setBreadcrumb: () => {
      let newBreadcrumb = breadcrumb;

      if (breadcrumb instanceof Function) {
        newBreadcrumb = breadcrumb(ownProps);
      }

      dispatch(appSetBreadcrumb(newBreadcrumb));
    },
  });

  return connect(
    null,
    mapDispatch,
  )(InjectBreadcrumb);
};

export default injectBreadcrumb;
