package dev.kviklet.kviklet.db.util

import org.hibernate.annotations.IdGeneratorType
import org.hibernate.engine.spi.SharedSessionContractImplementor
import org.hibernate.id.enhanced.SequenceStyleGenerator
import java.io.Serializable
import java.nio.ByteBuffer
import java.util.*


class IdGenerator : SequenceStyleGenerator() {

    override fun generate(sharedSessionContractImplementor: SharedSessionContractImplementor, obj: Any): Serializable {
        if (obj is BaseEntity && obj.id != null && obj.id!!.length == 22) {
            return obj.id!!
        }
        return generateId()
    }

    fun generateId(): Serializable {
        val uuid = UUID.randomUUID()
        val bb: ByteBuffer = ByteBuffer.allocate(16)
        bb.putLong(uuid.mostSignificantBits)
        bb.putLong(uuid.leastSignificantBits)
        val encoded = base58encode(bb.array())
        return if (encoded.length == 21) "$encoded " else encoded
    }

    override fun allowAssignedIdentifiers(): Boolean {
        return true
    }
}

@IdGeneratorType(IdGenerator::class)
@Target(AnnotationTarget.FIELD)
@Retention(AnnotationRetention.RUNTIME)
internal annotation class KvikletGeneratedId