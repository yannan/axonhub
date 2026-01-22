export const REDEMPTIONS_QUERY = `
  query Redemptions($first: Int, $after: String, $where: RedemptionWhereInput) {
    redemptions(first: $first, after: $after, where: $where) {
      totalCount
      edges {
        node {
          id
          name
          status
          quota
          created_time
          used_time
          expired_time
          used_user_id
          key
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

export const CREATE_REDEMPTION_MUTATION = `
  mutation CreateRedemption($input: CreateRedemptionInput!) {
    createRedemption(input: $input) {
      id
      name
      status
      quota
      created_time
      key
    }
  }
`;

export const UPDATE_REDEMPTION_MUTATION = `
  mutation UpdateRedemption($id: Int!, $input: UpdateRedemptionInput!) {
    updateRedemption(id: $id, input: $input) {
      id
      name
      quota
      expired_time
    }
  }
`;

export const DELETE_REDEMPTION_MUTATION = `
  mutation DeleteRedemption($id: Int!) {
    deleteRedemption(id: $id)
  }
`;
