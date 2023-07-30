export interface Post {
  id: string;
  creation_timestamp: Date;
  title: string;
}

export const posts: Post[] = [
  {
    id: '00000000-0000-0000-0000-000000000000',
    creation_timestamp: new Date('2020-07-06'),
    title: 'Post 0',
  },
  {
    id: '00000000-0000-0000-0000-000000000001',
    creation_timestamp: new Date('2023-07-07'),
    title: 'Post 1',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    creation_timestamp: new Date('2023-07-08'),
    title: 'Post 2',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    creation_timestamp: new Date('2023-07-09'),
    title: 'Post 3',
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    creation_timestamp: new Date('2023-07-10'),
    title: 'Post 4',
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    creation_timestamp: new Date('2023-07-11'),
    title: 'Post 5',
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    creation_timestamp: new Date('2023-07-12'),
    title: 'Post 6',
  },
  {
    id: '00000000-0000-0000-0000-000000000007',
    creation_timestamp: new Date('2023-07-13'),
    title: 'Post 7',
  }
];
