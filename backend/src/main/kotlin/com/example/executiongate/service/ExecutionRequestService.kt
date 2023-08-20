package com.example.executiongate.service

import com.example.executiongate.controller.CreateCommentRequest
import com.example.executiongate.controller.CreateExecutionRequest
import com.example.executiongate.controller.CreateReviewRequest
import com.example.executiongate.controller.UpdateExecutionRequest
import com.example.executiongate.db.CommentPayload
import com.example.executiongate.db.DatasourceConnectionAdapter
import com.example.executiongate.db.ExecutionRequestAdapter
import com.example.executiongate.db.Payload
import com.example.executiongate.db.ReviewConfig
import com.example.executiongate.db.ReviewPayload
import com.example.executiongate.service.dto.Event
import com.example.executiongate.service.dto.ExecutionRequest
import com.example.executiongate.service.dto.ExecutionRequestDetails
import com.example.executiongate.service.dto.ExecutionRequestId
import com.example.executiongate.service.dto.ReviewStatus
import org.springframework.stereotype.Service
import jakarta.transaction.Transactional

@Service
class ExecutionRequestService(
    val executionRequestAdapter: ExecutionRequestAdapter,
    val datasourceConnectionAdapter: DatasourceConnectionAdapter,
    val executorService: ExecutorService,
) {

    @Transactional
    fun create(request: CreateExecutionRequest, userId: String): ExecutionRequest {
        val datasourceConnection = datasourceConnectionAdapter.getDatasourceConnection(request.datasourceConnectionId)

        return executionRequestAdapter.createExecutionRequest(
            connectionId = request.datasourceConnectionId,
            title = request.title,
            description = request.description,
            statement = request.statement,
            readOnly = request.readOnly,
            reviewStatus = resolveReviewStatus(emptySet(), datasourceConnection.reviewConfig),
            executionStatus = "PENDING",
            authorId = userId,
        )
    }

    @Transactional
    fun update(id: ExecutionRequestId, request: UpdateExecutionRequest): ExecutionRequestDetails {
        val executionRequestDetails = executionRequestAdapter.getExecutionRequestDetails(id)

        return executionRequestAdapter.updateExecutionRequest(
            id = executionRequestDetails.request.id,
            title = request.title ?: executionRequestDetails.request.title,
            description = request.description ?: executionRequestDetails.request.description,
            statement = request.statement ?: executionRequestDetails.request.statement,
            readOnly = request.readOnly ?: executionRequestDetails.request.readOnly,
        )
    }

    fun list(): List<ExecutionRequest> = executionRequestAdapter.listExecutionRequests()

    fun get(id: ExecutionRequestId): ExecutionRequestDetails =
        executionRequestAdapter.getExecutionRequestDetails(id)

    @Transactional
    fun createReview(id: ExecutionRequestId, request: CreateReviewRequest) = saveEvent(
        id,
        ReviewPayload(comment = request.comment, action = request.action),
    )

    @Transactional
    fun createComment(id: ExecutionRequestId, request: CreateCommentRequest) = saveEvent(
        id,
        CommentPayload(comment = request.comment),
    )

    private fun saveEvent(
        id: ExecutionRequestId,
        payload: Payload,
    ): Event {
        val (executionRequest, event) = executionRequestAdapter.addEvent(id, payload)

        val reviewStatus: ReviewStatus = resolveReviewStatus(
            executionRequest.events,
            executionRequest.request.connection.reviewConfig,
        )

        executionRequestAdapter.updateReviewStatus(id, reviewStatus)

        return event
    }

    fun resolveReviewStatus(
        events: Set<Event>,
        reviewConfig: ReviewConfig,
    ): ReviewStatus {
        println("events: $events")
        return ReviewStatus.APPROVED
    }

    fun execute(id: ExecutionRequestId): QueryResult {
        val executionRequest = executionRequestAdapter.getExecutionRequestDetails(id)
        val connection = executionRequest.request.connection

        return executorService.execute(
            connectionString = connection.getConnectionString(),
            username = connection.username,
            password = connection.password,
            executionRequest.request.statement,
        )
    }
}
