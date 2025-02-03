import React from 'react';
import { 
  ApolloClient, 
  InMemoryCache, 
  ApolloProvider,
  split, 
  HttpLink,
  ApolloLink,
  Operation,
  FetchResult,
  NextLink
} from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { DocumentNode } from 'graphql';

// Get API URLs from environment variables or fallback to localhost
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7071';
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:7071';

// Create WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(createClient({
  url: `${WS_BASE_URL}/api/graphql-ws`,
  connectionParams: {
    // Add any connection parameters needed (e.g., authentication)
  },
  retryAttempts: 5
}));

// Create HTTP link for queries and mutations
const httpLink = new HttpLink({
  uri: `${API_BASE_URL}/api/graphql`,
  credentials: 'include'
});

// Log the URLs being used
console.log('GraphQL HTTP URL:', `${API_BASE_URL}/api/graphql`);
console.log('GraphQL WS URL:', `${WS_BASE_URL}/api/graphql-ws`);

// Create error handling link
const errorLink = new ApolloLink((operation: Operation, forward: NextLink) => {
  return forward(operation).map((response: FetchResult) => {
    if (response.errors) {
      console.error('GraphQL Errors:', response.errors);
    }
    return response;
  });
});

// Split traffic between WebSocket and HTTP
const splitLink = split(
  ({ query }: { query: DocumentNode }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);

// Create Apollo Client
const client = new ApolloClient({
  link: ApolloLink.from([errorLink, splitLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          messages: {
            merge(existing = [], incoming: any[]) {
              return [...existing, ...incoming];
            }
          }
        }
      }
    }
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

interface GraphQLProviderProps {
  children: React.ReactNode;
}

export function GraphQLProvider({ children }: GraphQLProviderProps) {
  return (
    <ApolloProvider client={client}>
      {children}
    </ApolloProvider>
  );
}

// Export the client for direct usage if needed
export { client };
