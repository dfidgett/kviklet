import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import ReactMarkdown from "react-markdown";
import {
  ExecutionRequestResponseWithComments,
  getSingleRequest,
} from "../api/ExecutionRequestApi";
import { z } from "zod";
import Button from "../components/Button";
import { AuthenticationType } from "../api/DatasourceApi";

interface RequestReviewParams {
  requestId: string;
}

const componentMap = {
  code: ({ node, inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    return !inline && match ? (
      <SyntaxHighlighter
        style={vs}
        language={match[1]}
        PreTag="div"
        children={String(children).replace(/\n$/, "")}
        {...props}
      />
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  ul: ({ children }: any) => (
    <ul className="list-disc ml-4 mt-4">{children}</ul>
  ),
};

const testRequest = {
  id: "test",
  title: "JIRA-123: Test Request",
  author: {
    id: "test3",
    fullName: "Jascha Beste",
    email: "jascha@opsgate.io",
  },
  description:
    "I want to debug something which is why I join it with something else and order it by something else.",
  statement: `Select * from somewhere
where something = 1
  and something_else = 2
  and something_else_else = 3
join something_else_else_else
  on something_else_else_else.id = something_else_else.id
order by something_else_else_else.id`,
  readOnly: true,
  // connection: z.string().min(1), currently not contained in response
  executionStatus: "PENDING",
  createdAt: new Date().toISOString(),
  connection: {
    id: "test",
    displayName: "Test Connection",
    authenticationType: AuthenticationType.USER_PASSWORD,
    description: "This is a test connection",
    shortUsername: "test",
    password: "password",
  },
  events: [
    {
      author: "Nils Borrmann",
      comment: "This is a comment",
      createdAt: new Date().toISOString(),
      id: "test2",
    },
    {
      author: "Jascha Beste",
      comment: `This is a comment with some markdown:  
markdown is **cool** and *stuff*
you can also write syntax highlighted code yay:

\`\`\`sql
select * from something
\`\`\`
      `,
      createdAt: new Date().toISOString(),
      id: "test4",
    },
  ],
};

function firstTwoLetters(input: string): string {
  const words = input.split(" ");
  let result = "";

  for (let i = 0; i < words.length; i++) {
    if (result.length < 2) {
      result += words[i][0];
    } else {
      break;
    }
  }

  return result;
}

function RequestReview() {
  const params = useParams() as unknown as RequestReviewParams;
  const [request, setRequest] = useState<
    ExecutionRequestResponseWithComments | undefined
  >(undefined);
  const [commentFormVisible, setCommentFormVisible] = useState<boolean>(true);
  const [commentFormValue, setCommentFormValue] = useState<string>("");
  const loadData = async () => {
    if (params.requestId === "test") {
      setRequest(testRequest);
      return;
    }
    const request = await getSingleRequest(params.requestId);
    setRequest(request);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddComment = async (event: any) => {
    event.preventDefault();
    //if approve button was clicked print help
    //@ts-ignore
    if (event.nativeEvent.submitter.id == "approve") {
      console.log("help");
    }

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const json = Object.fromEntries(formData.entries());
    const response = await fetch(
      `http://localhost:8080/execution-requests/${params.requestId}/comments/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ comment: json.comment }),
      }
    );
    console.log(response);
    loadData();
  };

  const runQuery = async () => {
    const response = await fetch(
      `http://localhost:8080/requests/${params.requestId}/run`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    );
    const json = await response.json();
    console.log(json);
  };

  return (
    <div>
      <div className="max-w-3xl m-auto">
        <h1 className="text-3xl my-2 w-full flex">
          <div className="mr-auto">{request?.title}</div>
          <div className="bg-lime-400 font-bold rounded-full text-lg ml-auto text-white py-1 px-1.5">
            {request?.executionStatus}
          </div>
        </h1>
        <div className="">
          <div className="">
            <RequestBox request={request} runQuery={runQuery}></RequestBox>
            <div>
              {request === undefined
                ? ""
                : request.events.map((event) => (
                    <Comment event={event}></Comment>
                  ))}
              <CommentBox handleAddComment={handleAddComment}></CommentBox>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestBox({
  request,
  runQuery,
}: {
  request: ExecutionRequestResponseWithComments | undefined;
  runQuery: (event: any) => void;
}) {
  return (
    <div>
      <div className="relative border-cyan-500 rounded-md border">
        <div className="comment-clip border-cyan-500 bg-cyan-500 w-2 h-4 absolute -left-2 top-2"></div>
        <div className="comment-clip border-cyan-500 bg-cyan-200 w-2 h-4 absolute -left-2 top-2 ml-px"></div>
        <div className="absolute -left-12 rounded-full p-2 bg-cyan-500 text-gray-100  w-8 h-8 flex items-center justify-center text-l font-bold">
          {firstTwoLetters(request?.author.fullName ?? "")}
        </div>
        <p className="text-slate-800 px-2 py-2 text-sm flex justify-between bg-cyan-200 border-b border-cyan-500 rounded-t-md">
          <div>
            {request?.author.fullName} wants to execute on:{" "}
            <span className="italic">{request?.connection.displayName}</span>
          </div>
          <div>
            Created at: {new Date(request?.createdAt ?? "").toLocaleString()}
          </div>
        </p>
        <div className="p-3">
          <p className="text-slate-500">{request?.description}</p>
          <SyntaxHighlighter language="sql" showLineNumbers style={vs}>
            {request === undefined ? "404" : request.statement}
          </SyntaxHighlighter>
        </div>
      </div>
      <div className="relative ml-4 flex justify-end">
        <div className="bg-slate-500 w-0.5 absolute block whitespace-pre left-0 top-0 bottom-0">
          {" "}
        </div>
        <Button
          className="mt-3"
          id="runQuery"
          type={
            (request?.executionStatus == "SUCCESS" && "disabled") || "submit"
          }
          onClick={runQuery}
        >
          <div className="play-triangle inline-block bg-white w-2 h-3 mr-2"></div>
          Run Query
        </Button>
      </div>
    </div>
  );
}

function Comment({
  event,
}: {
  event: { author?: string; createdAt: string; comment: string };
}) {
  return (
    <div>
      <div className="relative py-4 ml-4 flex">
        <div className="bg-slate-500 w-0.5 absolute block whitespace-pre left-0 top-0 bottom-0">
          {" "}
        </div>
        <svg className="h-4 w-4 -ml-2 mr-2 mt-0.5 inline-block align-text-bottom items-center bg-white z-0">
          <path d="M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"></path>
        </svg>
        <div className="text-slate-500 text-sm">{event?.author} commented:</div>
      </div>
      <div className="relative border-cyan-500 rounded-md border">
        <div className="comment-clip border-cyan-500 bg-cyan-500 w-2 h-4 absolute -left-2 top-2"></div>
        <div className="comment-clip border-cyan-500 bg-cyan-200 w-2 h-4 absolute -left-2 top-2 ml-px"></div>
        <div className="absolute -left-12 rounded-full p-2 bg-cyan-500 text-gray-100  w-8 h-8 flex items-center justify-center text-l font-bold">
          {firstTwoLetters(event?.author ?? "")}
        </div>
        <p className="text-slate-800 px-2 py-2 text-sm flex justify-between bg-cyan-200 border-b border-cyan-500 rounded-t-md">
          <div>
            Created at: {new Date(event?.createdAt ?? "").toLocaleString()}
          </div>
        </p>
        <div className="p-3">
          <ReactMarkdown components={componentMap}>
            {event.comment}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

function CommentBox({
  handleAddComment,
}: {
  handleAddComment: (event: any) => void;
}) {
  const [commentFormVisible, setCommentFormVisible] = useState<boolean>(true);
  const [commentFormValue, setCommentFormValue] = useState<string>("");
  return (
    <div>
      <div className="relative py-4 ml-4">
        <div className="bg-slate-500 w-0.5 absolute block whitespace-pre left-0 top-0 bottom-0">
          {" "}
        </div>
      </div>
      <div className="border-slate-300 rounded-md border relative mb-5">
        <div className="comment-clip border-slate-300 bg-slate-300 w-2 h-4 absolute -left-2 top-2"></div>
        <div className="comment-clip border-slate-300 bg-slate-100 w-2 h-4 absolute -left-2 top-2 ml-px"></div>
        <div className="absolute -left-12 rounded-full p-2 bg-slate-500 text-gray-100  w-8 h-8 flex items-center justify-center text-l font-bold">
          {firstTwoLetters("Jascha Beste")}
        </div>
        <div className="mb-2 border-b-slate-300 border bg-slate-100 rounded-t-md">
          <div className="-mb-px z-10 overflow-auto">
            <button
              className={`mt-2 ml-2 ${
                commentFormVisible
                  ? "border rounded-t-md border-b-white bg-white"
                  : ""
              }  border-slate-300 px-4 py-2 text-sm text-slate-600 leading-6`}
              onClick={() => setCommentFormVisible(true)}
            >
              write
            </button>
            <button
              className={`mt-2 ${
                commentFormVisible
                  ? ""
                  : "border rounded-t-md border-b-white bg-white"
              } border-slate-300  px-4 py-2 text-sm text-slate-600 leading-6`}
              onClick={() => setCommentFormVisible(false)}
            >
              preview
            </button>
          </div>
        </div>
        <div className="px-3">
          {commentFormVisible ? (
            <textarea
              className="appearance-none block w-full text-gray-700 border border-gray-200 bg-slate-100 focus:bg-white p-1 rounded leading-normal mb-2 focus:outline-none focus:border-gray-500"
              id="comment"
              name="comment"
              rows={4}
              onChange={(event) => setCommentFormValue(event.target.value)}
              value={commentFormValue}
              placeholder="Leave a comment"
            ></textarea>
          ) : (
            <ReactMarkdown
              className="h-28 max-h-48 overflow-y-scroll scrollbar-thin scrollbar-track-slate-100  scrollbar-thumb-slate-300 scrollbar-thumb-rounded scrollbar-track-rounded border-r-slate-300 my-2"
              components={componentMap}
            >
              {commentFormValue}
            </ReactMarkdown>
          )}
          <div className="px-1">
            <div className="flex justify-end mb-2">
              <Button
                className="mr-2"
                id="addComment"
                onClick={handleAddComment}
              >
                Add Comment
              </Button>
              <Button id="approve" type="submit" onClick={handleAddComment}>
                Approve
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RequestReview;
