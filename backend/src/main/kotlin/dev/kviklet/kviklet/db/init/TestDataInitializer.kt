package dev.kviklet.kviklet.db.init

import dev.kviklet.kviklet.db.DatasourceConnectionEntity
import dev.kviklet.kviklet.db.DatasourceConnectionRepository
import dev.kviklet.kviklet.db.ExecutionRequestEntity
import dev.kviklet.kviklet.db.ExecutionRequestRepository
import dev.kviklet.kviklet.db.PolicyEntity
import dev.kviklet.kviklet.db.PolicyRepository
import dev.kviklet.kviklet.db.ReviewConfig
import dev.kviklet.kviklet.db.RoleEntity
import dev.kviklet.kviklet.db.RoleRepository
import dev.kviklet.kviklet.db.UserEntity
import dev.kviklet.kviklet.db.UserRepository
import dev.kviklet.kviklet.security.Permission
import dev.kviklet.kviklet.service.dto.AuthenticationType
import dev.kviklet.kviklet.service.dto.DatasourceType
import dev.kviklet.kviklet.service.dto.PolicyEffect
import dev.kviklet.kviklet.service.dto.RequestType
import org.springframework.boot.ApplicationRunner
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Profile
import org.springframework.security.crypto.password.PasswordEncoder
import java.util.concurrent.ThreadLocalRandom

@Configuration
@Profile("local", "e2e")
class TestDataInitializer(
    private val datasourceConnectionRepository: DatasourceConnectionRepository,
    private val executionRequestRepository: ExecutionRequestRepository,
    private val roleRepository: RoleRepository,
    private val policyRepository: PolicyRepository,
) {

    // Helper function to generate an ExecutionRequestEntity
    fun generateExecutionRequest(
        connection: DatasourceConnectionEntity,
        titlePrefix: String,
        index: Int,
        author: UserEntity,
    ): ExecutionRequestEntity {
        val title = "$titlePrefix Execution Request $index"
        val description = "Description of the $titlePrefix execution request $index"
        val statement = "Select * from test;"
        val readOnly = ThreadLocalRandom.current().nextBoolean()
        val executionStatus = if (ThreadLocalRandom.current().nextBoolean()) "SUCCESS" else "PENDING"
        return ExecutionRequestEntity(
            connection = connection,
            title = title,
            type = RequestType.SingleQuery,
            description = description,
            statement = statement,
            readOnly = readOnly,
            executionStatus = executionStatus,
            author = author,
            events = mutableSetOf(),
        )
    }

    fun generateRole(savedUser: UserEntity) {
        val role = RoleEntity(
            name = "Test Role",
            description = "This is a test role",
            policies = setOf(
                PolicyEntity(
                    action = "*",
                    effect = PolicyEffect.ALLOW,
                    resource = "*",
                ),
            ),
        )
        val savedRole = roleRepository.saveAndFlush(role)

        savedUser.roles += savedRole
    }

    fun createDevRole() {
        val role = RoleEntity(
            name = "Developer Role",
            description = "This role gives permission to create, review and execute requests",
            policies = setOf(
                PolicyEntity(
                    action = Permission.DATASOURCE_CONNECTION_GET.getPermissionString(),
                    effect = PolicyEffect.ALLOW,
                    resource = "*",
                ),
                PolicyEntity(
                    action = Permission.EXECUTION_REQUEST_GET.getPermissionString(),
                    effect = PolicyEffect.ALLOW,
                    resource = "*",
                ),
                PolicyEntity(
                    action = Permission.EXECUTION_REQUEST_EDIT.getPermissionString(),
                    effect = PolicyEffect.ALLOW,
                    resource = "*",
                ),
                PolicyEntity(
                    action = Permission.EXECUTION_REQUEST_EXECUTE.getPermissionString(),
                    effect = PolicyEffect.ALLOW,
                    resource = "*",
                ),
                PolicyEntity(
                    action = Permission.USER_GET.getPermissionString(),
                    effect = PolicyEffect.ALLOW,
                    resource = "*",
                ),
                PolicyEntity(
                    action = Permission.USER_EDIT.getPermissionString(),
                    effect = PolicyEffect.ALLOW,
                    resource = "*",
                ),
            ),
        )
        val savedRole = roleRepository.saveAndFlush(role)
    }

    @Bean
    fun initializer(userRepository: UserRepository, passwordEncoder: PasswordEncoder): ApplicationRunner {
        return ApplicationRunner { _ ->

            println("initializing data")

            if (userRepository.findAll().isNotEmpty()) {
                return@ApplicationRunner
            }

            val user = UserEntity(
                email = "testUser@example.com",
                fullName = "Admin User",
                password = passwordEncoder.encode("testPassword"),
            )

            val savedUser = userRepository.saveAndFlush(user)

            // Create connections linked to the saved datasource
            val connection1 = DatasourceConnectionEntity(
                id = "test-connection",
                displayName = "Test Connection",
                databaseName = null,
                authenticationType = AuthenticationType.USER_PASSWORD,
                description = "This is a localhost connection",
                username = "postgres",
                password = "postgres",
                reviewConfig = ReviewConfig(numTotalRequired = 1),
                type = DatasourceType.POSTGRESQL,
                hostname = "localhost",
                port = 5432,
            )

            // Save the connection
            val savedConnection1 = datasourceConnectionRepository.saveAndFlush(connection1)

            val request1 = generateExecutionRequest(savedConnection1, "First", 1, savedUser)

            executionRequestRepository.save(request1)

            generateRole(savedUser)
            createDevRole()
            userRepository.saveAndFlush(savedUser)
        }
    }
}
